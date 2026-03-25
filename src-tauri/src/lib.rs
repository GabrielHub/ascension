use serde::Serialize;
use serde_json::Value;
use std::{
  fs,
  path::{Path, PathBuf},
};
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::{DialogExt, FilePath};

const SLOT_IDS: [&str; 3] = ["slot/1", "slot/2", "slot/3"];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopHostEnvironment {
  platform: String,
  app_local_data_dir: String,
  save_dir: String,
  export_dir: String,
  log_dir: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopSlotFiles {
  slot_id: String,
  primary_json: Option<String>,
  backup_json: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopFileExportResult {
  cancelled: bool,
  destination_path: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopFileImportResult {
  cancelled: bool,
  source_path: Option<String>,
  json: Option<String>,
}

struct SavePaths {
  primary: PathBuf,
  backup: PathBuf,
  temp: PathBuf,
}

fn validate_slot_id(slot_id: &str) -> Result<(), String> {
  if SLOT_IDS.contains(&slot_id) {
    Ok(())
  } else {
    Err(format!("Unsupported save slot id: {slot_id}"))
  }
}

fn slot_file_stem(slot_id: &str) -> Result<String, String> {
  validate_slot_id(slot_id)?;
  Ok(slot_id.replace('/', "-"))
}

fn path_to_string(path: &Path) -> String {
  path.to_string_lossy().into_owned()
}

fn app_local_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
  app
    .path()
    .app_local_data_dir()
    .map_err(|error| format!("Unable to resolve app-local data directory: {error}"))
}

fn ensure_directory(path: &Path) -> Result<(), String> {
  fs::create_dir_all(path)
    .map_err(|error| format!("Unable to create directory {}: {error}", path_to_string(path)))
}

fn save_root_dir(app: &AppHandle) -> Result<PathBuf, String> {
  let path = app_local_data_dir(app)?.join("saves");
  ensure_directory(&path)?;
  Ok(path)
}

fn export_root_dir(app: &AppHandle) -> Result<PathBuf, String> {
  let path = app_local_data_dir(app)?.join("exports");
  ensure_directory(&path)?;
  Ok(path)
}

fn log_root_dir(app: &AppHandle) -> Result<PathBuf, String> {
  let path = app_local_data_dir(app)?.join("logs");
  ensure_directory(&path)?;
  Ok(path)
}

fn cleanup_stale_temp_files(app: &AppHandle) -> Result<(), String> {
  let save_dir = save_root_dir(app)?;

  for slot_id in SLOT_IDS {
    let stem = slot_file_stem(slot_id)?;
    let temp_path = save_dir.join(format!("{stem}.tmp.json"));
    if temp_path.exists() {
      fs::remove_file(&temp_path).map_err(|error| {
        format!(
          "Unable to remove stale temp save {}: {error}",
          path_to_string(&temp_path)
        )
      })?;
    }
  }

  Ok(())
}

fn slot_paths(app: &AppHandle, slot_id: &str) -> Result<SavePaths, String> {
  let save_dir = save_root_dir(app)?;
  let stem = slot_file_stem(slot_id)?;

  Ok(SavePaths {
    primary: save_dir.join(format!("{stem}.json")),
    backup: save_dir.join(format!("{stem}.bak.json")),
    temp: save_dir.join(format!("{stem}.tmp.json")),
  })
}

fn read_optional_text(path: &Path) -> Result<Option<String>, String> {
  if !path.exists() {
    return Ok(None);
  }

  fs::read_to_string(path)
    .map(Some)
    .map_err(|error| format!("Unable to read {}: {error}", path_to_string(path)))
}

fn write_text(path: &Path, value: &str) -> Result<(), String> {
  fs::write(path, value).map_err(|error| format!("Unable to write {}: {error}", path_to_string(path)))
}

fn remove_if_exists(path: &Path) -> Result<(), String> {
  if path.exists() {
    fs::remove_file(path)
      .map_err(|error| format!("Unable to delete {}: {error}", path_to_string(path)))?;
  }

  Ok(())
}

fn ensure_valid_save_payload(slot_id: &str, json: &str) -> Result<(), String> {
  let parsed: Value =
    serde_json::from_str(json).map_err(|error| format!("Save payload is not valid JSON: {error}"))?;

  let payload_slot_id = parsed
    .get("slotId")
    .and_then(Value::as_str)
    .ok_or_else(|| "Save payload is missing slotId.".to_string())?;

  if payload_slot_id != slot_id {
    return Err(format!(
      "Save payload slotId {payload_slot_id} does not match requested slot {slot_id}."
    ));
  }

  Ok(())
}

fn atomic_write_slot(app: &AppHandle, slot_id: &str, json: &str) -> Result<(), String> {
  ensure_valid_save_payload(slot_id, json)?;
  cleanup_stale_temp_files(app)?;
  let paths = slot_paths(app, slot_id)?;

  write_text(&paths.temp, json)?;

  let temp_contents = fs::read_to_string(&paths.temp)
    .map_err(|error| format!("Unable to re-read temp save {}: {error}", path_to_string(&paths.temp)))?;
  serde_json::from_str::<Value>(&temp_contents)
    .map_err(|error| format!("Temp save file failed JSON validation: {error}"))?;

  if paths.primary.exists() {
    remove_if_exists(&paths.backup)?;
    fs::rename(&paths.primary, &paths.backup).map_err(|error| {
      format!(
        "Unable to move primary save {} to backup {}: {error}",
        path_to_string(&paths.primary),
        path_to_string(&paths.backup)
      )
    })?;
  }

  fs::rename(&paths.temp, &paths.primary).map_err(|error| {
    format!(
      "Unable to promote temp save {} to primary {}: {error}",
      path_to_string(&paths.temp),
      path_to_string(&paths.primary)
    )
  })?;

  Ok(())
}

fn file_path_to_path(file_path: FilePath) -> Result<PathBuf, String> {
  file_path
    .into_path()
    .map_err(|_| "The selected file path could not be resolved on this platform.".to_string())
}

fn resolve_export_destination(
  app: &AppHandle,
  destination_path: Option<String>,
  _suggested_file_name: &str,
) -> Result<Option<PathBuf>, String> {
  match destination_path {
    Some(path) => Ok(Some(PathBuf::from(path))),
    None => {
      let Some(path) = app.dialog().file().blocking_save_file() else {
        return Ok(None);
      };

      Ok(Some(file_path_to_path(path)?))
    }
  }
}

fn resolve_import_source(app: &AppHandle, source_path: Option<String>) -> Result<Option<PathBuf>, String> {
  match source_path {
    Some(path) => Ok(Some(PathBuf::from(path))),
    None => {
      let Some(path) = app.dialog().file().blocking_pick_file() else {
        return Ok(None);
      };

      Ok(Some(file_path_to_path(path)?))
    }
  }
}

#[tauri::command]
fn desktop_host_get_environment(app: AppHandle) -> Result<DesktopHostEnvironment, String> {
  cleanup_stale_temp_files(&app)?;
  let app_local_data_dir = app_local_data_dir(&app)?;
  let save_dir = save_root_dir(&app)?;
  let export_dir = export_root_dir(&app)?;
  let log_dir = log_root_dir(&app)?;

  Ok(DesktopHostEnvironment {
    platform: std::env::consts::OS.to_string(),
    app_local_data_dir: path_to_string(&app_local_data_dir),
    save_dir: path_to_string(&save_dir),
    export_dir: path_to_string(&export_dir),
    log_dir: path_to_string(&log_dir),
  })
}

#[tauri::command]
fn desktop_save_read_slot_files(app: AppHandle, slot_id: String) -> Result<DesktopSlotFiles, String> {
  cleanup_stale_temp_files(&app)?;
  let paths = slot_paths(&app, &slot_id)?;

  Ok(DesktopSlotFiles {
    slot_id,
    primary_json: read_optional_text(&paths.primary)?,
    backup_json: read_optional_text(&paths.backup)?,
  })
}

#[tauri::command]
fn desktop_save_write_slot(app: AppHandle, slot_id: String, json: String) -> Result<(), String> {
  atomic_write_slot(&app, &slot_id, &json)
}

#[tauri::command]
fn desktop_save_delete_slot(app: AppHandle, slot_id: String) -> Result<(), String> {
  cleanup_stale_temp_files(&app)?;
  let paths = slot_paths(&app, &slot_id)?;

  remove_if_exists(&paths.primary)?;
  remove_if_exists(&paths.backup)?;
  remove_if_exists(&paths.temp)?;

  Ok(())
}

#[tauri::command]
fn desktop_save_export_json(
  app: AppHandle,
  json: String,
  suggested_file_name: String,
  destination_path: Option<String>,
) -> Result<DesktopFileExportResult, String> {
  serde_json::from_str::<Value>(&json)
    .map_err(|error| format!("Export payload is not valid JSON: {error}"))?;
  let export_dir = export_root_dir(&app)?;
  let destination = resolve_export_destination(
    &app,
    destination_path.or_else(|| {
      Some(
        export_dir
          .join(suggested_file_name)
          .to_string_lossy()
          .into_owned(),
      )
    }),
    "",
  )?;

  let Some(path) = destination else {
    return Ok(DesktopFileExportResult {
      cancelled: true,
      destination_path: None,
    });
  };

  write_text(&path, &json)?;

  Ok(DesktopFileExportResult {
    cancelled: false,
    destination_path: Some(path_to_string(&path)),
  })
}

#[tauri::command]
fn desktop_save_import_json(
  app: AppHandle,
  source_path: Option<String>,
) -> Result<DesktopFileImportResult, String> {
  let Some(path) = resolve_import_source(&app, source_path)? else {
    return Ok(DesktopFileImportResult {
      cancelled: true,
      source_path: None,
      json: None,
    });
  };

  let json = fs::read_to_string(&path)
    .map_err(|error| format!("Unable to read import file {}: {error}", path_to_string(&path)))?;

  Ok(DesktopFileImportResult {
    cancelled: false,
    source_path: Some(path_to_string(&path)),
    json: Some(json),
  })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(
      tauri_plugin_log::Builder::default()
        .level(log::LevelFilter::Info)
        .build(),
    )
    .invoke_handler(tauri::generate_handler![
      desktop_host_get_environment,
      desktop_save_read_slot_files,
      desktop_save_write_slot,
      desktop_save_delete_slot,
      desktop_save_export_json,
      desktop_save_import_json
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

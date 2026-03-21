# Genre Research: Colony Sim / Settlement Builder with Dungeon Elements

This document captures comprehensive research on the original Towns game (2012), comparable games in the genre, and the core structural features that make these games work. It is intended as a reference for comparing against Ascension's design.

---

## Part 1: The Original Towns Game (2012)

### Overview

Towns was an isometric-view town building and dungeon exploring simulation developed by the three-person group SMP (Xavi Canal, Alex Poysky, Ben Palgi). It launched on Steam Greenlight on November 7, 2012. The game drew direct inspiration from Dungeon Keeper, Diablo, and Dwarf Fortress, combining settlement management on the surface with an active dungeon system underground.

The core pitch: instead of playing the hero who delves into the dungeon, the player builds and manages the town that houses and caters to the hero's needs.

### Core Gameplay Mechanics

#### Settlement Building

- Players controlled settlers ("Townsfolk") by issuing orders and placing zones rather than direct control.
- Orders included chopping trees, mining stone, crafting structures, tilling farmland, and harvesting.
- Zones designated functional areas: carpentry, masonry, forge, kitchen/bakery, hospital, tavern, marketplace, arena.
- Scaffolds were used for construction (free but deteriorated over time).
- Stockpiles organized resources by type: raw materials, raw food, prepared food, utilities, furniture, armor, weapons, decorations.
- Multiple architectural styles: stone houses, wooden shacks, green roofs, castle towers.

#### The Vertical Layered World

- The map was measured in layers/floors, with the surface on top and dungeon floors descending below.
- The first floor was the surface where the town existed.
- Below the surface was a multi-level dungeon, a randomly generated labyrinth of caves and corridors filled with monsters.
- Each dungeon floor was randomly generated but always contained the same category of monsters, creating a progression where players conquered each floor using equipment forged from treasures found on the previous floor.
- Different map types existed: Grass, Desert, Jungle, Snow, Mixed/Mountain, each with unique resources and monster types.
- "Buried maps" were more difficult but provided opportunities for advanced loot.

#### The Hero System (What Made It Unique)

- The town attracted travelling heroes who independently explored the dungeons below.
- Heroes fought monsters, gained levels, acquired special skills, and collected loot autonomously.
- Heroes could not be manually equipped; they picked up items mostly while idling or wandering.
- Different hero types required specific items built inside tavern rooms to attract them:
  - Barbarian: bone bed
  - Elf: harp
  - Knight: wooden bed
  - Dwarf: room built underground
  - Mage: wooden cupboard
- Heroes were reworked in updates so they waited to be fully healed before returning to dungeons.
- Unique heroes could be revived using the shrine utility at significant resource cost.

#### Resource Gathering and Crafting

- **Food**: Wild fruits and plants gathered from the overmap. Tilled soil for farming. Auto-harvest available through production menus. Some food rotted if not stored properly.
- **Wood**: Chopping trees for immediate wood. Tree farms on tilled soil for renewable production. Planted non-fruit trees regrew after harvesting.
- **Stone**: Stone tiles appeared naturally. Mining/digging had a strong chance to drop quarried stone.
- **Animals**: Farms produced livestock. Animals required feeding. Could be butchered for meat and bones.
- **Crafting tables**: Carpenter's bench, wood detailer, mason's bench, anvil, smelter, stove/cooking fire, baker's table/oven.
- **Item enchantments**: Crafted and monster-dropped items could gain random modifiers with prefixes/suffixes (e.g., "Of the turtle" for health, "Big" for attack, "Red" for damage). Items with both prefix and suffix had blue text.
- **Production chains**: Raw materials to intermediate goods to finished products (e.g., grain to flour via mill to bread via oven).

#### Citizen Management

- **Task priorities**: Food preparation, gathering, mining, construction, hauling, trading. Distant tasks were more efficient when assigned to focused workers.
- **Happiness system**: Affected by work/idle timer balance, decorations (required line-of-sight), eating cake, fishing. Extra line-of-sight from bows or enchantments helped citizens see happiness-boosting items more often.
- **Immigration**: New townsfolk arrived when existing citizens reached sufficient happiness AND empty personal rooms existed. Work and happiness needed balance, usually achieved when food autoproduction was the only active task queue.
- **Soldiers**: Citizens could be converted to soldiers with guard (defend attacked townsfolk), patrol (move between waypoints), or supervise (boost productivity) tasks. Soldiers gained experience over time, but levels and experience were wiped if returned to civilian tasks.
- **Groups**: Multiple townsfolk could be organized into groups with shared task assignments.
- **Death and corpses**: Deceased townsfolk left bodies spawning stink clouds (happiness penalty) and eventually ghosts. Management: gravestones, selling remains to merchants, or destroying corpses.

#### Combat System

- Citizens could be converted to soldiers for local defense.
- Traps dealt damage or applied effects (spike traps near food barrels were recommended to stop theft).
- Sieges occurred periodically with monsters attacking the town.
- Channeling enemies through chokepoints was an important defensive strategy.
- Equipment progression: bone armor (best early armor for many heroes), stone weapons, iron gear, and advanced materials.

#### Food Systems

- Multiple food sources: gathered fruits, planted crops, butchered meat, prepared dishes.
- Raw food became prepared meals through cooking tables.
- Flour-based items required mill processing.
- Food decayed if not stored in appropriate containers.
- Keeping most townsfolk able to produce food was critical to prevent starvation.

### What Players Loved Most

1. **The core concept**: The inversion of the dungeon crawler where you build the town supporting heroes rather than being the hero. This was genuinely novel.
2. **Addictive building loop**: Once past the learning curve, setting out tasks and watching townsfolk work was satisfying and relaxing.
3. **Architectural variety**: Multiple building styles gave creative expression.
4. **The dungeon-below-town premise**: Having an active dungeon generating both threats and opportunities directly beneath the settlement created unique tension.
5. **Emergent complexity**: The interaction between surface management and dungeon progression created interesting decision-making.

### Why It Failed / Was Abandoned

#### Development Collapse

- Lead developer Xavi Canal gave up in February 2014, citing burnout.
- Development was handed to Florian "Moebius" Frankenberger, who worked for 15% of remaining revenue after taxes and Steam fees.
- Frankenberger quit on May 6, 2014, stating the income was too low to sustain himself, as sales had declined rapidly.
- The game had sold over 200,000 copies generating over $2 million gross revenue, yet remained available for purchase in its unfinished state.

#### Key Problems

1. **Launched without Early Access designation**: Players purchased a $15 game without being told it was unfinished beta. This created false expectations of a complete product.
2. **No in-game tutorials**: Players found the game extremely difficult to learn.
3. **Technical issues**: Java-based client caused launch-day failures. Windows 7 64-bit compatibility problems.
4. **Single save file**: Only one save existed; starting a new game deleted the old one.
5. **Game-breaking bugs**: Players continuously found obvious design flaws and game-breaking bugs.
6. **Buggy and unfinished**: Despite developers claiming "stable and fully playable," reviews called it buggy and unfinished.
7. **Sequel proposal backlash**: After abandonment, proposing a sequel intensified community anger.

#### What Players Felt Was Missing or Broken

- Adequate tutorials and onboarding
- Multiple save slots
- Polish and bug fixes across all systems
- Better hero AI and equipment management
- Deeper citizen AI and pathfinding
- More complete implementation of the ambitious feature set
- Better UI and information presentation
- Stability and performance optimization
- The promised scope of features from SimCity + Dungeon Keeper + Dwarf Fortress + Diablo was never delivered

---

## Part 2: Games Similar to Towns

### Dwarf Fortress (The Grandfather)

**Developer**: Bay 12 Games (Tarn and Zach Adams)
**Status**: Active development since 2006, Steam release with graphics in 2022

#### Core Systems

- **Fortress Mode**: Open-ended construction and management simulation with no explicit objectives.
- **World Generation**: Procedurally generates entire worlds with centuries of history, civilizations, personalities, creatures, and cultures. Over 200 rock and mineral types in proper geological environments.
- **Z-Levels**: Extensive vertical gameplay. Default maps have ~50 z-levels of land with 15 z-levels of sky. Mountainous regions can have well over 100 z-levels of caverns. Maps can range from 6 to 600+ z-levels.
- **Dwarf Needs**: Food, drink (booze is essential - "a sober dwarf is an unhappy dwarf"), variety in drinks, nice rooms, possessions, libraries, temples, taverns, socialization, prayer, crafting satisfaction.
- **Happiness/Stress System**: Thoughts (good and bad) accumulate into stress. Good thoughts make dwarves ecstatic; too many bad thoughts cause tantrums. Mood is tied to thoughts, not needs. Unsatisfied needs cause distraction (slows work) but not unhappiness directly.
- **Combat**: Body-part-based damage model (limbs, organs, skin, fat, muscle, tendons, bones, nerves, arteries). Damage causes specific effects: fainting, vomiting, mobility loss, nerve damage. Defense via armor, dodging, shields, parrying.
- **Military**: Squad-based with scheduling. Soldiers operate as part-time militiamen. Training through sparring or fighting captured creatures. Uniforms (armor sets) assigned per squad.
- **Defense**: Moats, drawbridges, traps (mechanisms + weapons like spikes, axes, cages), burrow system for civilian evacuation.
- **Economy/Trade**: Caravans arrive for trade. Wealth accumulation attracts both immigrants and threats.
- **Weather**: Dynamic model tracking wind, humidity, air masses, fronts, clouds, storms, blizzards.
- **Crafting**: Extensive workshop system. Quality levels on crafted items. Artifact creation through strange moods.

#### What Makes It Unique

- Unparalleled simulation depth
- Emergent storytelling through system interactions
- The motto "losing is fun"
- Every dwarf is a fully simulated individual with preferences, relationships, and history

---

### Gnomoria

**Developer**: Robotronic Games
**Status**: Released 1.0 in 2016, development ceased

#### Core Systems

- **World Generation**: Procedurally generated, fully destructible environment.
- **Z-Levels**: Vertical gameplay with underground mining. Stone found at -7 and below. Metal depth configurable (iron not above -50 at normal settings).
- **Enemy Spawning**: Depth-based. Enemies spawn in unlit areas near gnomes. Beetles at -10 and below. Torches critical for underground safety.
- **Crafting**: Extensive workshop system including bone carving, weaving, masonry, forging. Quality affects satisfaction. More crafting steps = better quality product.
- **Economy**: No currency. Barter-based trade using trade values modified by quality. Stockpiling wealth attracts wandering "gnomads" (immigrants) but also enemies.
- **Food/Drink Quality**: Tiered system. Drinks: water < milk < wine/beer/tea. Foods: meat < fruit/egg < bread/sausage < sandwich/omelette.
- **Job System**: Granular task assignment (e.g., "hauling wood," "stonecarving"). Professions like Woodsman, Miner with further customization.
- **Mechanisms**: Steam engines, hatches, levers, and elaborate contraptions.
- **Sandbox Modes**: Peaceful town management or military-focused defense.

#### Relationship to Towns

Gnomoria was the most direct competitor/successor to Towns, attempting to be "Dwarf Fortress but accessible" in a similar vein. It had more polish than Towns but was also eventually abandoned (though after reaching 1.0).

---

### RimWorld

**Developer**: Ludeon Studios (Tynan Sylvester)
**Status**: Released 1.0 in 2018, active DLC development

#### Core Systems

- **AI Storyteller System** (genre-defining innovation):
  - Cassandra Classic: Increasing difficulty curve with breathing room between events.
  - Phoebe Chillax: Long gaps between disasters, but hits as hard at high difficulty.
  - Randy Random: Completely random events regardless of narrative sense.
  - Storytellers consider colony wealth, colonist count, animal count, recent deaths/injuries, and time since last major event.
- **Colonist System**: Each colonist has unique traits, skills, and backstories affecting abilities and interactions. Example: a brilliant doctor with "Pyromaniac" trait saves lives but starts fires during mental breaks.
- **Mood System**: Blue bar 0-100%. Mood Target (instant sum of all thoughts) vs actual Mood bar (moves toward target at +12/hour increasing, -8/hour decreasing). Base mood of 32.
  - Mental Break Thresholds: Extreme (5%), Major (20%), Minor (35%).
  - Low mood causes mental breaks; high mood triggers inspirations.
  - Affected by difficulty, traits, environment, and passion for assigned work.
- **Wealth-Threat Escalation**: Colony wealth directly determines raid strength and frequency. Wealth includes items at full value, structures at half value, pawns, and animals. This creates a fundamental strategic tension around expansion pace.
- **Research Tech Tree**: Presented as a branching tree. One project at a time, freely switchable. Speed based on Intellectual skill. Tech levels (Neolithic, Medieval, Industrial, etc.) with difficulty scaling for factions.
- **Trade**: Sells at 60% market value, buys at 140%. Orbital trade beacons (require Microelectronics research) and caravan trading. High-value trade goods: drugs, art, specialized items.
- **Caravans**: Form expeditions with colonists, animals, prisoners to trade, quest, or rescue allies.
- **Health**: Tracks injuries, illnesses, prosthetics per body part.
- **Food/Farming**: Season-dependent agriculture. Soil quality matters. Food spoilage. Cooking quality tiers.

#### What Makes It Unique

- The storyteller system creates procedural drama rather than just procedural content
- "Story generator" design philosophy where mechanics exist to create memorable narratives
- Two gameplay loops: inner (daily survival) and outer (long-term development)
- Wealth-threat feedback creates natural difficulty curve

---

### Oxygen Not Included

**Developer**: Klei Entertainment
**Status**: Released 1.0 in 2019, active DLC development

#### Core Systems

- **Physics Simulation**: Thermodynamics, gas diffusion, fluid dynamics, power networks, automation circuits, disease vectors.
- **Atmosphere Management**: Real-time gas simulation. Oxygen generation, CO2 accumulation, gas pressure, temperature.
- **Pipe/Power Systems**: Interlocking pipe networks. Multiple power sources (coal, hydrogen, natural gas, manual). Circuit overloads and meltdowns.
- **Resource Recycling**: Waste becomes fuel. Unbreathable gas becomes air. Creature byproducts become food.
- **Duplicant Management**: Each duplicant has unique traits and potentially destructive stress responses. Skills unlock through earned Skill Points. Higher-tier skills increase morale requirements.
- **Stress System**: Morale threshold. Great halls, better food, recreational items reduce stress. Workload balance prevents buildup.
- **Research**: Research Station (Novice points) available at start. Super Computer (Advanced points) unlocked through research tree. Full tree requires 2,940 Novice + 2,840 Advanced + 2,800 Interstellar points.
- **World Generation**: Procedurally generated asteroid with biome subdivisions containing biome-specific materials and critters.
- **Vertical Gameplay**: 2D side-view with extensive vertical building and digging.

#### What Makes It Unique

- Physics-based survival creates emergent cascading failures
- Every system has physical properties (heat, pressure, state changes)
- The challenge is managing interconnected physical systems, not combat
- Incredibly deep engineering puzzles within a colony sim framework

---

### Going Medieval

**Developer**: Foxy Voxel
**Status**: Released 1.0 in March 2025, 1 million units sold during Early Access

#### Core Systems

- **3D Construction**: Fully three-dimensional building system. Multi-level medieval settlements with wood, clay, stone. Underground cellars, towering fortresses, terrain manipulation.
- **Z-Levels**: 16 levels total split in half (8 above, 8 below). Z and X keys navigate levels. Camera cuts away upper layers when viewing lower levels.
- **Terrain Editing**: Players reshape terrain, create hidden chambers, mining networks, underground bases.
- **Vertical Gameplay Impact**: Placement affects temperature, storage efficiency, defensive capability, workflow optimization. Underground storage stays cooler for food preservation.
- **Settler Simulation**: Every settler fully simulated with unique behavior and personalities.
- **Seasons**: Spring/summer for farming and preparation. Winter requires prepared food stores, shelter, fuel.
- **Combat/Defense**: Traps, fortifications, walls, guard towers. Terrain editing for defensive advantages.
- **Global Stats**: Macro-view of colony health, food reserves, defensive capabilities (added in 1.0).
- **Story Events**: Random events shape settlement development.

#### What Makes It Unique

- The 3D building system is the standout feature, making vertical construction intuitive
- Temperature simulation ties directly into building decisions
- Post-plague setting provides strong thematic motivation

---

### Stonehearth

**Developer**: Radiant Entertainment (acquired by Riot Games)
**Status**: Released 1.0 in 2019, development ceased

#### Core Systems

- **Job System**: Every settler has a job functioning like an RPG class. Jobs include hauling, building, crafting, fighting. Workers gain experience and levels. Some jobs upgrade to new jobs with prerequisites met.
- **Building System**: Pre-fabricated templates or custom building design with custom floorplans, walls, roofs, item placement.
- **Crafting**: Interconnected crafting chains (e.g., mason needs mallet/chisel from carpenter).
- **Dynamic AI Encounters**: Procedurally generated threats.
- **Colony Needs**: Food, shelter, defense, mood management, growth, and expansion.

#### What Makes It Unique

- Most visually polished game in the genre (voxel art style)
- RPG-class-based job progression for settlers
- Accessible to casual players while retaining depth
- Attempted to bridge the gap between Dwarf Fortress depth and mainstream accessibility

---

### KeeperRL

**Developer**: Michal Brzozowski
**Status**: Active development

#### Core Systems

- **Dual Gameplay Modes**:
  - Real-time dungeon building/colony sim (base building, minion management)
  - Simultaneous turn-based roguelike adventure (direct control of minions for exploration/combat)
- **Dungeon Construction**: Dig into mountains. Sleeping quarters, training rooms, crafting stations, decorations. Defensible design with traps, guard areas, chokepoints.
- **Faction System**: 10+ unique factions with respective keepers (Dark Wizard, Necromancer, Goblin King, etc.).
- **Immigration**: Attract minions based on dungeon quality and faction.
- **Research**: Technology progression.
- **Day/Night Cycle**: Impacts combat mechanics (night vision, undead vulnerability during day).
- **Permadeath**: Permanent consequences for combat losses.
- **Multi-Level Gameplay**: Vertical dungeon construction.

#### What Makes It Unique

- The combination of dungeon building with direct roguelike control of minions
- Play as the villain building the dungeon
- Faction diversity creates distinct playstyles
- Closest spiritual successor to Dungeon Keeper in the colony sim space

---

### Odd Realm

**Developer**: Unknown Origin Games
**Status**: Released 1.0 in August 2024

#### Core Systems

- **Multiple Playable Races**: Four races with unique playstyles and mechanics (Humans, skeleton people who excel at magic, others). Each race has distinct gameplay traits.
- **Procedural Generation**: Fantasy world with five biomes (Desert, Voidland, Taiga, Tropical, Tundra). Complex cave systems, discoverable loot, hidden threats.
- **Seasonal System**: Passing seasons with temperature mechanics.
- **Building and Crafting**: Blueprints for building blocks, props, trees, platforms.
- **Threats**: Changing seasons, roaming marauders, underground horrors.
- **3D Procedural Terrain**: Vertical gameplay with z-levels.

#### What Makes It Unique

- Multiple playable races with mechanically distinct playstyles (rare in the genre)
- Fantasy setting with magical elements integrated into colony sim mechanics
- Pixel art aesthetic with surprising depth

---

### Songs of Syx

**Developer**: Jake the Dondorian
**Status**: Active development (currently v70+)

#### Core Systems

- **Massive Scale**: Settlements can grow from small colonies to metropolises of 8,000-10,000+ citizens.
- **Population-Based Progression**: New status levels unlock as population grows, granting new bonuses and buildings.
- **Economy**: Currency system (Denaris). Inns and tourist attractions can produce 10,000+ Denaris/day. Complex production chains.
- **Research**: Must be continually supported in laboratories and libraries. Tech can slip away if population stops working on it (unique mechanic).
- **Race System**: Different races have different preferences. Cretonians like farming, Dondorians prefer industry, Humans like libraries, Talipi prefer hunting.
- **Farming**: 16 agriculture buildings. Climate-dependent (cold, temperate, warm). Cotton farms get +50% in warm, -50% in cold. Irrigation mechanics. Grain is the most efficient food production chain.
- **Military**: Large-scale battles with flanking, charging. Archers, catapults. Thousands of simulated soldiers.
- **Seasons/Climate**: Distinct climates per location affect farming and available crops.

#### What Makes It Unique

- Unparalleled scale (tens of thousands of citizens with deep simulation)
- Research degradation mechanic
- Race preferences creating different economic paths
- Military battles at massive scale

---

### Foundation

**Developer**: Polymorph Games
**Status**: Released 1.0, positive reception

#### Core Systems

- **Gridless Building**: No grid. Organic city growth. Citizens create natural paths in most-traveled areas.
- **Painting Mechanic**: Designate areas rather than place individual buildings. Citizens do the construction.
- **Monument Construction**: Proprietary node-based tool for free-form monuments (Abbeys, Churches, Castles).
- **Resource Management**: Anno-style depth. Production chains, role assignment, taxation, trading.
- **Military**: Walls, guard towers, Companies that go on expeditions for resources.
- **Progression**: Empire aspirations, Coat of Arms creation, adjustable game rules.

#### What Makes It Unique

- Gridless, organic city growth (unique in the genre)
- The painting/designation system for area assignment
- Monument builder as a core creative tool
- Medieval setting with emphasis on aesthetic beauty over survival

---

### Timber and Stone

**Developer**: Robert Reed
**Status**: Early Access, slow development

#### Core Systems

- **Medieval Fantasy Setting**: Over 100 resources to gather and craft.
- **Procedural World Generation**: Varied maps.
- **Settler Immigration**: Requires high food levels and roads connected to map edges leading to a hall. Each connected edge gives +24.99% immigration chance.
- **Resource Deconstruction**: Left-click objects to deconstruct, gather resources, domesticate/slaughter animals.
- **RTS-style gameplay**: Real-time strategy feel with deeper complexity.

---

### Dungeon Settlers (2025, Upcoming)

**Developer**: CanOpener
**Status**: Coming soon (as of 2025)

#### Core Systems

- **Colony Sim + Dungeon Crawler Hybrid**: Build settlement in barren land, then lead expeditions into dungeons.
- **Guild Expedition Framing**: Player leads a Guild-sent expedition to explore, conquer, and destroy the dungeon.
- **Party System**: Train members considering equipment, skills, traits. Form parties of up to 4.
- **Combat**: Real-time with pause tactical combat. No turn/round limits. Analyze enemy traits and patterns.

#### Why It Matters

Dungeon Settlers explicitly addresses the colony sim/dungeon crawler hybrid gap, acknowledging that the space has been "surprisingly underserved." This validates the design space that Towns originally pioneered.

---

### Other Notable Games

- **Banished**: Pure survival colony sim. Baseline for the genre. Harsh winters, food spoilage, plagues. No combat focus.
- **Frostpunk**: Colony sim under extreme environmental pressure. Moral dilemmas. Laws system.
- **Surviving Mars**: Sci-fi colony sim on Mars. Dome-based construction. Resource management under hostile conditions.
- **Timberborn**: Beaver colony sim focused on water management (dams, reservoirs, drought survival).
- **Settlement Survival**: Full control of population with food, housing, education, trade, and natural disaster survival.
- **Stardeus**: Sci-fi colony sim with flexible resource processing (Processor + Crafter devices). Advanced economy with currency, global market, merchants, and stock market.
- **Cult of the Lamb**: Hybrid colony sim / action roguelike with dual gameplay modes.
- **Pioneers of Pagonia**: Visible, walkable supply routes. 40+ buildings, hundreds of production chains.
- **A Hero's Rest**: RPG town simulator directly inspired by the Towns concept (build the town that supports heroes).

---

## Part 3: Core Structural Features Across the Genre

### 1. Economy and Resource Systems

| Pattern                      | Examples                                  | Notes                                                                    |
| ---------------------------- | ----------------------------------------- | ------------------------------------------------------------------------ |
| Single currency              | RimWorld (silver), Songs of Syx (Denaris) | Simple to understand, easy to balance                                    |
| Multiple resources           | Dwarf Fortress (dozens), ONI (dozens)     | Creates complex production chains                                        |
| No currency / barter         | Gnomoria                                  | Trade values on goods, quality modifiers                                 |
| Wealth accumulation = threat | RimWorld, Dwarf Fortress, Gnomoria        | Natural difficulty scaling; hoarding has consequences                    |
| Production chains            | All games                                 | Raw material -> intermediate -> finished good. More steps = higher value |
| Resource decay/spoilage      | RimWorld, Going Medieval, Towns           | Creates urgency around food processing and storage                       |

**Key Structural Insight**: The best systems create tension between accumulating resources (needed for growth) and the consequences of wealth (increased threats). RimWorld's wealth-raid scaling is the clearest implementation.

**Relevance to Ascension**: The generic resource ledger approach in Ascension's design aligns well with industry best practices. Starting with cash and expanding later mirrors how RimWorld starts simple but scales.

---

### 2. Citizen/Colonist AI and Needs

| System                         | Implementation                                         | Games                                                                              |
| ------------------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| **Need hierarchies**           | Food > shelter > comfort > social > self-actualization | RimWorld, Dwarf Fortress, ONI                                                      |
| **Mood/happiness as a number** | Aggregate of positive/negative thoughts                | RimWorld (0-100%), Dwarf Fortress (stress), Towns (happiness), ONI (stress %)      |
| **Mental breaks**              | Low mood triggers destructive behaviors                | RimWorld (tantrums, binges, psychotic breaks), Dwarf Fortress (tantrums, violence) |
| **Traits/personality**         | Permanent modifiers to behavior/capability             | RimWorld (Pyromaniac, Optimist, etc.), Dwarf Fortress (preferences, values)        |
| **Skill progression**          | Skills improve through use                             | RimWorld, Stonehearth (job leveling), Dwarf Fortress                               |
| **Social relationships**       | Friendships, rivalries, romance                        | RimWorld, Dwarf Fortress                                                           |
| **Autonomy**                   | Citizens make independent decisions                    | All games. Key tension: player influence vs citizen agency                         |

**Key Structural Insight**: The mood system is the primary feedback mechanism. It tells the player whether management is succeeding or failing. The best implementations (RimWorld, Dwarf Fortress) create cascading failure states where one unhappy citizen can destabilize others.

**Relevance to Ascension**: Operator morale and staff satisfaction map directly onto these patterns. The "autonomy creates stories" design pillar aligns with how RimWorld and DF generate emergent narratives through citizen AI.

---

### 3. Building and Construction

| Approach              | Games                                              | Tradeoffs                                                     |
| --------------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| **Zone/designation**  | Dwarf Fortress, Foundation, Towns                  | Player marks areas, citizens build. Organic growth.           |
| **Direct placement**  | RimWorld, Going Medieval                           | Player places exact structures. More control, less organic.   |
| **Modular/free-form** | Foundation (monuments), Going Medieval (3D blocks) | High creative expression but complexity.                      |
| **Templates**         | Stonehearth, RimWorld                              | Reusable designs. Faster building.                            |
| **Tiered buildings**  | Towns, Stonehearth                                 | Buildings upgrade through tiers, unlocking new capabilities.  |
| **Gridless**          | Foundation                                         | Unique organic aesthetic but harder to design systems around. |

**Key Structural Insight**: Building systems need to balance creative expression with gameplay legibility. The most successful games make building decisions have gameplay consequences (temperature in Going Medieval, room quality in RimWorld, defense chokepoints in Dwarf Fortress).

**Relevance to Ascension**: The floor-by-floor room placement with building tier progression is well-aligned with genre conventions. The tiered room upgrade system (message board -> bar -> club) mirrors progression patterns seen across the genre.

---

### 4. Combat and Defense

| System                        | Games                                                            | Key Feature                                          |
| ----------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| **Direct military control**   | Dwarf Fortress (squad orders), RimWorld (draft + direct control) | Most common. Player controls soldiers during fights. |
| **Autonomous combat**         | Towns (heroes fight independently), KeeperRL (adventure mode)    | Less player agency, more emergent outcomes.          |
| **Simulated/resolved combat** | Dungeon Settlers (real-time with pause)                          | Player sets up conditions, resolution is simulated.  |
| **Trap systems**              | Dwarf Fortress, Towns, KeeperRL, Going Medieval                  | Preparation-based defense.                           |
| **Body part damage**          | Dwarf Fortress, RimWorld                                         | Granular injury tracking.                            |
| **Wealth-scaled threats**     | RimWorld, Dwarf Fortress, Gnomoria                               | Threats grow with colony success.                    |
| **Siege events**              | Towns, Dwarf Fortress, RimWorld, Going Medieval                  | Periodic large-scale attacks test defenses.          |

**Key Structural Insight**: The genre splits between games where combat is directly controlled (RimWorld, DF) and games where combat is autonomous/simulated (Towns heroes). The autonomous approach is rarer but creates a different kind of tension: you prepare and live with outcomes rather than executing tactics.

**Relevance to Ascension**: The raid simulation approach should stay closer to Towns' hero system, where operators autonomously decide to pursue opportunities while the player manages conditions and reads outcomes. This is a strong design position that differentiates from the majority of the genre.

---

### 5. Exploration and Discovery

| Pattern                | Games                                                 | Notes                                     |
| ---------------------- | ----------------------------------------------------- | ----------------------------------------- |
| **Dungeon layers**     | Towns, KeeperRL, Dwarf Fortress (caverns)             | Progressive difficulty as depth increases |
| **Overworld map**      | RimWorld (world map + caravans), Songs of Syx         | External locations to visit/trade/raid    |
| **Underground biomes** | Dwarf Fortress (cavern layers), ONI (asteroid biomes) | Distinct environments at different depths |
| **Fog of war**         | Most games                                            | Unexplored areas hidden until visited     |
| **Procedural loot**    | Towns (enchanted items), Dwarf Fortress (artifacts)   | Randomized rewards from exploration       |

**Relevance to Ascension**: The city map for raid selection serves the same structural role as overworld maps in other colony sims, but the urban setting gives it a distinct identity.

---

### 6. Progression Systems

| Pattern                      | Games                                 | How It Works                                              |
| ---------------------------- | ------------------------------------- | --------------------------------------------------------- |
| **Building tier upgrades**   | Towns, Stonehearth, Going Medieval    | Buildings unlock higher capabilities through upgrades     |
| **Population milestones**    | Songs of Syx, Gnomoria                | Population triggers new status levels and unlocks         |
| **Research/tech tree**       | RimWorld, ONI, KeeperRL               | Dedicated research infrastructure unlocks capabilities    |
| **Wealth-based progression** | Dwarf Fortress, Gnomoria              | Accumulating value attracts immigrants and unlocks events |
| **Building relocation**      | Ascension (bodega -> office -> tower) | Rare in genre. Most games stay in one location.           |
| **Degradable research**      | Songs of Syx                          | Tech can slip away if not maintained. Unique mechanic.    |

**Key Structural Insight**: Most games use a combination of these. RimWorld layers tech tree + wealth + population. The building relocation concept in Ascension is genuinely unusual in the genre and represents a potential differentiator.

**Relevance to Ascension**: The bodega-to-tower progression is the game's primary progression spine. This is rare enough in the genre to be distinctive but needs careful design to avoid feeling like "restart with more stuff."

---

### 7. Threat and Challenge Escalation

| Pattern                    | Games                                         | Mechanism                                          |
| -------------------------- | --------------------------------------------- | -------------------------------------------------- |
| **Wealth-scaled raids**    | RimWorld                                      | Total colony wealth determines raid difficulty     |
| **Depth-based monsters**   | Towns, Gnomoria, Dwarf Fortress               | Deeper = harder enemies                            |
| **Timed escalation**       | RimWorld (Cassandra), Going Medieval          | Difficulty increases over time with breathing room |
| **Random events**          | RimWorld (Randy), Going Medieval              | Unpredictable crises test preparation              |
| **Environmental pressure** | ONI (heat death, oxygen depletion), Frostpunk | The world itself is the threat                     |
| **Immigration pressure**   | Dwarf Fortress, Gnomoria                      | More citizens = more mouths = more problems        |

**Key Structural Insight**: The best escalation systems create a feeling of "I invited this problem through my success." RimWorld's wealth scaling is the gold standard. Pure time-based escalation feels arbitrary.

**Relevance to Ascension**: The rank system (E through S) for people, dungeons, and guild reputation provides a natural escalation framework. Higher-rank operators have higher expectations, higher-rank dungeons are more dangerous, and higher reputation attracts bigger problems.

---

### 8. World Generation

| Approach                      | Games                                      | Notes                                                 |
| ----------------------------- | ------------------------------------------ | ----------------------------------------------------- |
| **Full world history**        | Dwarf Fortress                             | Centuries of generated history, civilizations, events |
| **Planet-scale**              | RimWorld                                   | Generated planet with biomes, factions, settlements   |
| **Map-scale**                 | Towns, Gnomoria, Going Medieval, Odd Realm | Single play area procedurally generated               |
| **Asteroid/contained**        | ONI                                        | Enclosed procedural environment                       |
| **Hand-crafted + procedural** | Foundation                                 | Semi-procedural terrain with player-directed growth   |

**Relevance to Ascension**: The near-future NYC setting is hand-crafted rather than procedurally generated. This is a deliberate design choice that trades replayability for thematic identity and sense of place.

---

### 9. Z-Levels / Vertical Gameplay

| Implementation         | Games                                 | Depth                                                        |
| ---------------------- | ------------------------------------- | ------------------------------------------------------------ |
| **Extensive z-levels** | Dwarf Fortress (50-600+)              | Most complex. Full 3D world navigated one layer at a time    |
| **Moderate z-levels**  | Going Medieval (16), Gnomoria (~100+) | Significant but manageable                                   |
| **Layer-based**        | Towns (surface + dungeon floors)      | Discrete floors rather than continuous z-levels              |
| **2D side-view**       | ONI, RimWorld                         | Vertical visible simultaneously. No z-level switching needed |
| **None**               | Foundation                            | Flat plane with organic growth                               |

**Key UX Challenge**: Z-level navigation is consistently cited as a pain point across all games that implement it (Dwarf Fortress, Going Medieval, Gnomoria). The camera management burden increases with vertical complexity.

**Relevance to Ascension**: The floor-by-floor top-down view sidesteps the z-level UX problem while retaining vertical progression (bodega = 1 floor, office = multiple floors, tower = many floors). This is a smart design choice.

---

### 10. Storytelling Systems

| Approach                       | Games                 | Notes                                                                    |
| ------------------------------ | --------------------- | ------------------------------------------------------------------------ |
| **AI Storyteller**             | RimWorld              | Algorithmic event generation based on colony state. Genre-defining.      |
| **Emergent from simulation**   | Dwarf Fortress        | Stories emerge from deep simulation without explicit storytelling system |
| **Event system**               | Going Medieval, Towns | Random events occur periodically                                         |
| **Player-projected narrative** | Most colony sims      | Players create narratives from what happens                              |

**Key Structural Insight**: RimWorld's storyteller is the most important innovation in the genre since Dwarf Fortress itself. It creates drama rather than just content. The storyteller adjusts pacing, escalation, and breathing room to create narrative arcs.

**Relevance to Ascension**: The "autonomy creates stories" pillar and the raid resolution system serve as Ascension's storytelling engine. Operator personalities, raid outcomes, and management crises generate narratives.

---

### 11. Morale/Happiness Systems

| System                 | Key Mechanic                            | Games                                                                      |
| ---------------------- | --------------------------------------- | -------------------------------------------------------------------------- |
| **Aggregate thoughts** | Sum of positive/negative modifiers      | RimWorld, Dwarf Fortress                                                   |
| **Room quality**       | Better rooms = happier citizens         | Dwarf Fortress, RimWorld, Going Medieval                                   |
| **Food quality**       | Better meals = happier citizens         | All games (tiered food in Gnomoria, ONI, RimWorld)                         |
| **Social needs**       | Interaction with others                 | Dwarf Fortress (taverns, temples), RimWorld                                |
| **Work satisfaction**  | Passion/preference for assigned work    | RimWorld, Dwarf Fortress                                                   |
| **Comfort/luxury**     | Decorations, possessions, variety       | Dwarf Fortress (variety in drinks/food), Towns (line-of-sight decorations) |
| **Cascading failures** | One unhappy citizen destabilizes others | RimWorld (social fights), Dwarf Fortress (tantrum spirals)                 |

**Relevance to Ascension**: Operator morale affected by guild quality, salary satisfaction, injury recovery, and raid outcomes maps well onto proven patterns. The "guild ambiance attracts better talent" mechanic is equivalent to room quality driving immigration.

---

### 12. Trade Systems

| Pattern                   | Games                              | Notes                                            |
| ------------------------- | ---------------------------------- | ------------------------------------------------ |
| **Visiting traders**      | RimWorld, Dwarf Fortress, Gnomoria | Periodic trader arrivals with variable inventory |
| **Caravan/expedition**    | RimWorld, Foundation               | Player sends citizens out to trade               |
| **Market building**       | Towns, Songs of Syx                | Dedicated structure enables trade                |
| **Buy/sell spread**       | RimWorld (60%/140%)                | Creates economic pressure. Buying is expensive.  |
| **Quality affects value** | Gnomoria, Dwarf Fortress           | Higher quality items worth more in trade         |

---

### 13. Research/Tech Trees

| Approach                     | Games                                        | Notes                                           |
| ---------------------------- | -------------------------------------------- | ----------------------------------------------- |
| **Branching tree**           | RimWorld                                     | Traditional tech tree with prerequisites        |
| **Tiered research stations** | ONI                                          | Different stations for different research tiers |
| **Strange moods/artifacts**  | Dwarf Fortress                               | Research through inspired creation              |
| **Population-gated**         | Songs of Syx                                 | Population thresholds unlock capabilities       |
| **Degradable**               | Songs of Syx                                 | Unique: tech can be lost if not maintained      |
| **Multiple unlock methods**  | RimWorld (research + schematics + artifacts) | Diverse paths to the same tech                  |

**Relevance to Ascension**: The building tier system serves as the primary progression gate rather than a research tree. Building upgrades unlock room tiers, which unlock capabilities. This is structurally similar to population-gated progression in Songs of Syx.

---

### 14. Seasons/Weather

| Implementation             | Games                               | Impact                                                      |
| -------------------------- | ----------------------------------- | ----------------------------------------------------------- |
| **Full season cycle**      | RimWorld, Going Medieval, Odd Realm | Farming windows, temperature challenges, preparation cycles |
| **Climate zones**          | Songs of Syx, RimWorld              | Location determines available crops and challenges          |
| **Dynamic weather**        | Dwarf Fortress                      | Wind, humidity, storms, blizzards                           |
| **Drought cycles**         | Timberborn                          | Water management as core mechanic                           |
| **Temperature simulation** | ONI, Going Medieval                 | Physics-based heat management                               |
| **None**                   | Towns, Foundation                   | Focus on other systems instead                              |

**Relevance to Ascension**: The near-future NYC setting could support seasons (NYC has distinct seasons), but this is not identified as a core system in the current design. The game's pressure comes from economic and social systems rather than environmental ones.

---

### 15. Food and Farming Systems

| Pattern                 | Games                                   | Notes                                                  |
| ----------------------- | --------------------------------------- | ------------------------------------------------------ |
| **Tiered food quality** | Gnomoria, RimWorld, ONI, Dwarf Fortress | More processing steps = better food = happier citizens |
| **Spoilage/decay**      | RimWorld, Going Medieval, Towns         | Creates urgency around food processing and storage     |
| **Seasonal farming**    | RimWorld, Going Medieval, Songs of Syx  | Limited growing windows create preparation pressure    |
| **Crop variety**        | All games                               | Different crops for different purposes                 |
| **Auto-harvest**        | Towns, RimWorld                         | Automation of food collection                          |
| **Climate-dependent**   | Songs of Syx                            | Warm/cold climates enable/disable specific crops       |
| **Irrigation**          | Songs of Syx                            | Water adjacency boosts crop production                 |

**Relevance to Ascension**: Food is not a core resource in Ascension's current design (the economy runs on cash). However, the "needs" systems for operators and staff could incorporate analogous satisfaction tiers (quality of facilities, equipment, amenities) that serve the same structural role as food quality tiers.

---

## Part 4: Cross-Cutting Patterns and Lessons

### What Makes These Games Work (Common Success Factors)

1. **Clear feedback loops**: Player actions have visible, understandable consequences. Build better rooms -> happier citizens -> more immigration -> bigger colony -> harder threats.

2. **Meaningful tradeoffs**: Every decision has a cost. Expand too fast and you cannot defend. Stay too small and you stagnate. Spend on luxury and you lack military.

3. **Emergent stories**: The best games create stories through system interactions, not scripts. A colonist's pet dying, causing a mental break, causing a fire, causing a cascade of injuries is more memorable than any scripted event.

4. **Cascading failures**: Problems snowball if not addressed. This creates tension without requiring constant crisis.

5. **Visible progression**: Players need to see their colony grow and improve. The visual transformation from struggling settlement to thriving community is emotionally powerful.

6. **Autonomous agents**: Citizens who make their own decisions (sometimes badly) create more interesting gameplay than perfectly obedient units.

7. **Multiple viable strategies**: The best colony sims support different playstyles (military focus, economic focus, social focus, exploration focus).

### What Killed Towns (Lessons for Any Game in This Space)

1. **Ship what you promise**: Towns sold an unfinished game at full price without disclosure. Trust is everything.
2. **Tutorials and onboarding matter**: Complex systems need gradual introduction. Towns threw players into deep water.
3. **Sustainability over ambition**: The scope was too large for a three-person team. Burnout killed the project.
4. **Bug priority over features**: Players tolerated missing features better than game-breaking bugs.
5. **Save system basics**: Single save file was unacceptable even in 2012.
6. **Communication**: Developer silence during struggles destroyed community goodwill.

### The Underserved Niche

The "colony sim where you manage the town that supports autonomous adventurers going into dungeons" concept that Towns pioneered remains largely unserved. Most successors (Gnomoria, Going Medieval, etc.) dropped the hero/dungeon component. Only recent entries like Dungeon Settlers and A Hero's Rest are attempting to revisit this specific hybrid, suggesting continued player demand for the concept.

Ascension's positioning -- a guild management sim where autonomous operators go on raids while the player manages the headquarters -- directly addresses this underserved niche but translates it into a modern urban fantasy context.

---

## Sources

### Towns

- [Towns - Wikipedia](<https://en.wikipedia.org/wiki/Towns_(video_game)>)
- [Towns on Steam](https://store.steampowered.com/app/221020/Towns/)
- [Towns Review - New Game Network](https://www.newgamenetwork.com/article/762/towns-review/)
- [Towns Wiki](https://towns.fandom.com/wiki/Towns)
- [Towns Steam Guide - Wall of Text Guide](https://steamcommunity.com/sharedfiles/filedetails/?id=123900780)
- [Unfinished Steam Game Abandoned - Kotaku](https://kotaku.com/unfinished-steam-game-abandoned-after-thousands-bought-1572931721)
- [Towns development halts - PC Gamer](https://www.pcgamer.com/towns-development-halts-after-its-sole-developer-abandons-the-game/)
- [Towns abandoned by devs - Game Developer](https://www.gamedeveloper.com/business/alpha-funded-steam-game-i-towns-i-abandoned-by-devs)
- [Towns Dungeon Wiki](https://towns.fandom.com/wiki/Dungeon)

### Dwarf Fortress

- [Dwarf Fortress - Wikipedia](https://en.wikipedia.org/wiki/Dwarf_Fortress)
- [Dwarf Fortress on Steam](https://store.steampowered.com/app/975370/Dwarf_Fortress/)
- [DF Wiki - Z-Level](https://dwarffortresswiki.org/index.php/Z-level)
- [DF Wiki - Combat](https://dwarffortresswiki.org/index.php/Combat)
- [DF Wiki - Military](https://dwarffortresswiki.org/index.php/Military)
- [DF Wiki - Thoughts](https://dwarffortresswiki.org/index.php/DF2014:Thought)

### RimWorld

- [RimWorld Wiki - Mood](https://rimworldwiki.com/wiki/Mood)
- [RimWorld Wiki - AI Storytellers](https://rimworldwiki.com/wiki/AI_Storytellers)
- [RimWorld Wiki - Research](https://rimworldwiki.com/wiki/Research)
- [RimWorld Wiki - Trade](https://rimworldwiki.com/wiki/Trade)
- [RimWorld Features](https://rimworld.double11.com/features)
- [RimWorld Colony Psychology Guide](https://gamepadsquire.com/blog/rimworld-colony-psychology-guide)

### Oxygen Not Included

- [ONI - Klei Entertainment](https://www.klei.com/games/oxygen-not-included)
- [ONI on Steam](https://store.steampowered.com/app/457140/Oxygen_Not_Included/)
- [ONI Wiki - Skills](https://oxygennotincluded.wiki.gg/wiki/Skills)
- [ONI Masterclass Design - NeoGAF](https://www.neogaf.com/threads/oxygen-not-included-is-a-masterclass-in-colony-sim-design.1685195/)

### Going Medieval

- [Going Medieval on Steam](https://store.steampowered.com/app/1029780/Going_Medieval/)
- [Going Medieval Review - EIP Gaming](https://eip.gg/going-medieval/reviews/early-access-review-a-colony-sim-for-the-middle-ages/)
- [Going Medieval 1.0 Review](https://www.allkeyshop.com/blog/going-medieval-1-0-review-must-play-news-l/)
- [How to Build Underground - Set Ready Game](https://www.setreadygame.com/games/guides/how-to-build-underground-in-going-medieval/)

### Stonehearth

- [Stonehearth on Steam](https://store.steampowered.com/app/253250/Stonehearth/)
- [Stonehearth Wiki](https://stonehearth.fandom.com/wiki/Stonehearth)

### KeeperRL

- [KeeperRL on Steam](https://store.steampowered.com/app/329970/KeeperRL/)
- [KeeperRL Official Site](https://keeperrl.com/)
- [KeeperRL - PC Gamer](https://www.pcgamer.com/keeperrl-is-a-dungeon-keeper-inspired-building-sim-and-roguelike/)

### Odd Realm

- [Odd Realm on Steam](https://store.steampowered.com/app/688060)
- [Odd Realm - PC Gamer](https://www.pcgamer.com/fantasy-colony-sim-odd-realm-is-quite-charming-and-a-bit-weird/)
- [Odd Realm Wiki](https://oddrealm.wiki.gg/)

### Songs of Syx

- [Songs of Syx on Steam](https://store.steampowered.com/app/1162750/Songs_of_Syx/)
- [Songs of Syx Wiki - Settlement](https://www.songsofsyx.com/wiki/index.php/Settlement)
- [Songs of Syx Wiki - Agriculture](https://songsofsyx.com/wiki/index.php/Agriculture)
- [Songs of Syx Review - Reality Remake](https://www.realityremake.com/articles/songs-of-syx-review-a-brutally-complex-colony-sim-with-endless-replay)

### Foundation

- [Foundation on Steam](https://store.steampowered.com/app/690830/Foundation/)
- [Foundation - Polymorph Games](https://www.polymorph.games/en/)
- [Foundation Review - GINX](https://www.ginx.tv/en/video-games/foundation-review-polymorph-games)

### Timber and Stone

- [Timber and Stone on Steam](https://store.steampowered.com/app/408990/Timber_and_Stone/)

### Dungeon Settlers

- [Dungeon Settlers on Steam](https://store.steampowered.com/app/2798330/Dungeon_Settlers/)
- [Dungeon Settlers Review](https://www.ofzenandcomputing.com/dungeon-settlers-pro-review/)

### Genre Analysis

- [Colony Sims Best Combat - Game Rant](https://gamerant.com/colony-sims-best-combat/)
- [Best Colony Sims 2026](https://strategyandwargaming.com/2026/03/09/the-10-best-strategy-colony-sims-to-play-in-2026/)
- [Construction and Management Simulation - Wikipedia](https://en.wikipedia.org/wiki/Construction_and_management_simulation)
- [Best Colony Building Sim Games - G2A](https://www.g2a.com/news/features/best-colony-games/)

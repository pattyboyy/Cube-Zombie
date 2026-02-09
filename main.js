import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

const CHUNK_SIZE_X = 16;
const CHUNK_SIZE_Z = 16;
const WORLD_HEIGHT = 72;
const LOAD_RADIUS = 8;
const UNLOAD_RADIUS = 10;
const MAX_CHUNK_LOADS_PER_FRAME = 1;
const MAX_CHUNK_MESHES_PER_FRAME = 1;
const CHUNK_LOAD_BUDGET_MS = 5;
const CHUNK_MESH_BUDGET_MS = 5;
const WATER_PLANE_SIZE = CHUNK_SIZE_X * (UNLOAD_RADIUS * 2 + 8);
const FOG_HIDDEN_MARGIN_CHUNKS = 1.25;
const FOG_RAMP_WIDTH_CHUNKS = 2.0;
const FOG_FAR_DISTANCE = Math.max(
  CHUNK_SIZE_X * 2,
  (LOAD_RADIUS - FOG_HIDDEN_MARGIN_CHUNKS) * CHUNK_SIZE_X
);
const FOG_NEAR_DISTANCE = Math.max(
  CHUNK_SIZE_X,
  FOG_FAR_DISTANCE - FOG_RAMP_WIDTH_CHUNKS * CHUNK_SIZE_X
);

const MIN_TERRAIN_HEIGHT = 4;
const MAX_TERRAIN_HEIGHT = 44;
const SEA_LEVEL = 12;
const RIVER_WATER_MIN_INTENSITY = 0.45;
const RIVER_WATER_MAX_DEPTH = 3;

const PLAYER_WALK_SPEED = 7.2;
const PLAYER_SPRINT_MULTIPLIER = 1.55;
const PLAYER_GRAVITY = 28;
const PLAYER_JUMP_VELOCITY = 9.2;
const PLAYER_TERMINAL_VELOCITY = 35;
const PLAYER_HEIGHT = 1.78;
const PLAYER_EYE_HEIGHT = 1.62;
const PLAYER_RADIUS = 0.34;
const PLAYER_GROUND_CHECK_EPSILON = 0.06;
const PLAYER_COLLISION_STEP = 0.08;
const PLAYER_MAX_HEALTH = 100;
const PLAYER_DAMAGE_COOLDOWN = 0.52;
const DAY_LENGTH_SECONDS = 180;

const BLOCK = Object.freeze({
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  SNOW: 5,
  WOOD: 6,
  LEAVES: 7,
  CACTUS: 8,
  COAL_ORE: 9,
  IRON_ORE: 10,
  BIRCH_WOOD: 11,
  BIRCH_LEAVES: 12,
  BUSH: 13,
  FLOWER_RED: 14,
  FLOWER_YELLOW: 15,
  FLOWER_BLUE: 16,
  TALL_GRASS: 17,
  DEAD_BUSH: 18,
  MOSS: 19,
  RED_SAND: 20,
  BASALT: 21,
  ASH: 22,
  JUNGLE_WOOD: 23,
  JUNGLE_LEAVES: 24,
  ACACIA_WOOD: 25,
  ACACIA_LEAVES: 26,
  CHERRY_WOOD: 27,
  CHERRY_LEAVES: 28,
  BLOSSOM_FLOWER: 29,
  FERN: 30,
  REED: 31,
  CATTAIL: 32,
  WATER: 33,
  SHRUB: 34,
  BERRY_BUSH: 35,
  MEADOW_GRASS: 36,
  WILD_GRASS: 37,
  DRY_GRASS: 38,
});

const BIOME = Object.freeze({
  PLAINS: 0,
  FOREST: 1,
  DESERT: 2,
  ALPINE: 3,
  SWAMP: 4,
  SAVANNA: 5,
  BADLANDS: 6,
  TUNDRA: 7,
  JUNGLE: 8,
  MESA: 9,
  VOLCANIC: 10,
  CHERRY_GROVE: 11,
  REDWOOD: 12,
  OASIS: 13,
  HEATH: 14,
  MANGROVE: 15,
  STEPPE: 16,
  GLACIER: 17,
});
const BIOME_COUNT = 18;

const BIOME_NAMES = {
  [BIOME.PLAINS]: "Plains",
  [BIOME.FOREST]: "Forest",
  [BIOME.DESERT]: "Desert",
  [BIOME.ALPINE]: "Alpine",
  [BIOME.SWAMP]: "Swamp",
  [BIOME.SAVANNA]: "Savanna",
  [BIOME.BADLANDS]: "Badlands",
  [BIOME.TUNDRA]: "Tundra",
  [BIOME.JUNGLE]: "Jungle",
  [BIOME.MESA]: "Mesa",
  [BIOME.VOLCANIC]: "Volcanic",
  [BIOME.CHERRY_GROVE]: "Cherry Grove",
  [BIOME.REDWOOD]: "Redwood",
  [BIOME.OASIS]: "Oasis",
  [BIOME.HEATH]: "Heath",
  [BIOME.MANGROVE]: "Mangrove",
  [BIOME.STEPPE]: "Steppe",
  [BIOME.GLACIER]: "Glacier",
};

const BLOCK_COLORS = {
  [BLOCK.GRASS]: new THREE.Color(0x70be53),
  [BLOCK.DIRT]: new THREE.Color(0x8a633f),
  [BLOCK.STONE]: new THREE.Color(0x8b949d),
  [BLOCK.SAND]: new THREE.Color(0xd9c27d),
  [BLOCK.SNOW]: new THREE.Color(0xf4f8ff),
  [BLOCK.WOOD]: new THREE.Color(0x7a4f2d),
  [BLOCK.LEAVES]: new THREE.Color(0x4f9d48),
  [BLOCK.CACTUS]: new THREE.Color(0x3f9a41),
  [BLOCK.COAL_ORE]: new THREE.Color(0x5e6670),
  [BLOCK.IRON_ORE]: new THREE.Color(0x8f8173),
  [BLOCK.BIRCH_WOOD]: new THREE.Color(0xd8c28f),
  [BLOCK.BIRCH_LEAVES]: new THREE.Color(0x89c86d),
  [BLOCK.BUSH]: new THREE.Color(0x3f7f36),
  [BLOCK.FLOWER_RED]: new THREE.Color(0xd65555),
  [BLOCK.FLOWER_YELLOW]: new THREE.Color(0xdab84f),
  [BLOCK.FLOWER_BLUE]: new THREE.Color(0x5a78c6),
  [BLOCK.TALL_GRASS]: new THREE.Color(0x76b451),
  [BLOCK.DEAD_BUSH]: new THREE.Color(0x9e8662),
  [BLOCK.MOSS]: new THREE.Color(0x3f8b44),
  [BLOCK.RED_SAND]: new THREE.Color(0xbd6c45),
  [BLOCK.BASALT]: new THREE.Color(0x4a4d54),
  [BLOCK.ASH]: new THREE.Color(0x8f949b),
  [BLOCK.JUNGLE_WOOD]: new THREE.Color(0x6b4127),
  [BLOCK.JUNGLE_LEAVES]: new THREE.Color(0x2f7936),
  [BLOCK.ACACIA_WOOD]: new THREE.Color(0xa56f3f),
  [BLOCK.ACACIA_LEAVES]: new THREE.Color(0x8aab4f),
  [BLOCK.CHERRY_WOOD]: new THREE.Color(0xb08074),
  [BLOCK.CHERRY_LEAVES]: new THREE.Color(0xe38eb7),
  [BLOCK.BLOSSOM_FLOWER]: new THREE.Color(0xf59acb),
  [BLOCK.FERN]: new THREE.Color(0x4f9343),
  [BLOCK.REED]: new THREE.Color(0x78a95d),
  [BLOCK.CATTAIL]: new THREE.Color(0x7d8851),
  [BLOCK.WATER]: new THREE.Color(0x4f9edb),
  [BLOCK.SHRUB]: new THREE.Color(0x3a7a33),
  [BLOCK.BERRY_BUSH]: new THREE.Color(0x4b8f41),
  [BLOCK.MEADOW_GRASS]: new THREE.Color(0x92c962),
  [BLOCK.WILD_GRASS]: new THREE.Color(0x6ca347),
  [BLOCK.DRY_GRASS]: new THREE.Color(0xa49357),
};

const FACE_DEFS = [
  { dir: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { dir: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { dir: [0, 0, 1], corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
  { dir: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
];

const TRIANGLE_ORDER = [0, 1, 2, 0, 2, 3];

const DAY_SKY = new THREE.Color(0x98ceff);
const SUNSET_SKY = new THREE.Color(0xf0a166);
const NIGHT_SKY = new THREE.Color(0x080f20);
const DAY_FOG = new THREE.Color(0xb8d8ff);
const NIGHT_FOG = new THREE.Color(0x0c1830);
const SKY_TOP_DAY = new THREE.Color(0x5ea7ff);
const SKY_HORIZON_DAY = new THREE.Color(0xbfdfff);
const SKY_BOTTOM_DAY = new THREE.Color(0xeaf7ff);
const SKY_TOP_SUNSET = new THREE.Color(0x8d61bf);
const SKY_HORIZON_SUNSET = new THREE.Color(0xffb06e);
const SKY_BOTTOM_SUNSET = new THREE.Color(0xffd39d);
const SKY_TOP_NIGHT = new THREE.Color(0x040a17);
const SKY_HORIZON_NIGHT = new THREE.Color(0x122848);
const SKY_BOTTOM_NIGHT = new THREE.Color(0x071426);
const SUN_LIGHT_DAY = new THREE.Color(0xffffff);
const SUN_LIGHT_SUNSET = new THREE.Color(0xffbc7a);
const MOON_LIGHT_COLOR = new THREE.Color(0xa8c0ff);
const MOON_BOUNCE_SKY = new THREE.Color(0x90abef);
const MOON_BOUNCE_GROUND = new THREE.Color(0x263451);
const HEMI_SKY_DAY = new THREE.Color(0xcfe9ff);
const HEMI_SKY_NIGHT = new THREE.Color(0x9bb2ff);
const HEMI_GROUND_DAY = new THREE.Color(0x5f7f4a);
const HEMI_GROUND_NIGHT = new THREE.Color(0x21354f);
const SKY_SUN_GLOW_DAY = new THREE.Color(0xfff2bf);
const SKY_SUN_GLOW_SUNSET = new THREE.Color(0xffba7a);
const WATER_BLOCK_SHALLOW_COLOR = new THREE.Color(0x63aedd);
const WATER_BLOCK_DEEP_COLOR = new THREE.Color(0x1f4f84);
const CLOUD_COUNT = 34;
const CLOUD_VARIANT_COUNT = 3;
const CLOUD_FIELD_SIZE = CHUNK_SIZE_X * (LOAD_RADIUS * 2 + 34);
const CLOUD_ALTITUDE_BASE = WORLD_HEIGHT + 34;
const CLOUD_ALTITUDE_RANGE = 26;
const CLOUD_DRIFT_SPEED = 0.34;
const CLOUD_MIN_SEPARATION = 58;
const SKY_DOME_RADIUS = 540;
const STAR_COUNT = 4600;
const STARFIELD_RADIUS = SKY_DOME_RADIUS * 0.94;
const WATER_GRID_SEGMENTS = 88;
const TORCH_SHOW_DAYLIGHT = 0.42;
const TORCH_HIDE_DAYLIGHT = 0.58;
const TORCH_BASE_INTENSITY = 0.32;
const TORCH_MAX_INTENSITY = 1.75;
const TORCH_BASE_DISTANCE = 8.5;
const TORCH_MAX_DISTANCE = 16.5;
const GUN_FIRE_INTERVAL = 0.115;
const GUN_DAMAGE = 52;
const GUN_RANGE = 82;
const GUN_RECOIL_KICK = 0.16;
const GUN_RECOIL_RETURN = 8.5;
const GUN_MUZZLE_FLASH_DURATION = 0.055;
const PROJECTILE_SPEED = 110;
const PROJECTILE_POOL_SIZE = 56;
const PROJECTILE_LENGTH = 0.34;
const PROJECTILE_MAX_LIFETIME = 1.25;
const IMPACT_PARTICLE_POOL_SIZE = 260;
const IMPACT_PARTICLE_GRAVITY = 22;
const IMPACT_PARTICLES_HIT = 16;
const IMPACT_PARTICLES_WORLD = 11;
const ZOMBIE_MAX_COUNT = 56;
const ZOMBIE_HEALTH = 100;
const ZOMBIE_SPEED_MIN = 1.1;
const ZOMBIE_SPEED_MAX = 1.75;
const ZOMBIE_RADIUS = 0.34;
const ZOMBIE_HEIGHT = 1.98;
const ZOMBIE_HIT_STAGGER_TIME = 0.22;
const ZOMBIE_GRAVITY = 24;
const ZOMBIE_TERMINAL_VELOCITY = 28;
const ZOMBIE_JUMP_VELOCITY = 8.4;
const ZOMBIE_JUMP_COOLDOWN = 0.95;
const ZOMBIE_STEP_HEIGHT = 0.56;
const ZOMBIE_ATTACK_RANGE = 1.58;
const ZOMBIE_ATTACK_REACH_BUFFER = 0.34;
const ZOMBIE_ATTACK_DAMAGE = 10;
const ZOMBIE_ATTACK_COOLDOWN = 1.12;
const ZOMBIE_ATTACK_WINDUP = 0.27;
const ZOMBIE_ATTACK_RECOVERY = 0.34;
const ZOMBIE_ATTACK_TOTAL = ZOMBIE_ATTACK_WINDUP + ZOMBIE_ATTACK_RECOVERY;
const ZOMBIE_DEATH_DURATION = 0.58;
const ZOMBIE_RAGDOLL_DURATION = 5.8;
const ZOMBIE_RAGDOLL_FADE_TIME = 1.25;
const ZOMBIE_RAGDOLL_GRAVITY = 22.5;
const ZOMBIE_RAGDOLL_BOUNCE = 0.16;
const ZOMBIE_SPAWN_MIN_RADIUS = 18;
const ZOMBIE_SPAWN_MAX_RADIUS = 54;
const ZOMBIE_SPAWN_INTERVAL = 0.72;
const ZOMBIE_DESPAWN_RADIUS = 146;
const ZOMBIE_ACTIVE_DAYLIGHT = 0.62;

const NEIGHBOR_OFFSETS_2D = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const FLORA_RENDER_TYPES = [
  BLOCK.BUSH,
  BLOCK.SHRUB,
  BLOCK.BERRY_BUSH,
  BLOCK.FLOWER_RED,
  BLOCK.FLOWER_YELLOW,
  BLOCK.FLOWER_BLUE,
  BLOCK.BLOSSOM_FLOWER,
  BLOCK.TALL_GRASS,
  BLOCK.MEADOW_GRASS,
  BLOCK.WILD_GRASS,
  BLOCK.DRY_GRASS,
  BLOCK.FERN,
  BLOCK.DEAD_BUSH,
  BLOCK.REED,
  BLOCK.CATTAIL,
];

const pressedKeys = new Set();
const activeChunks = new Map();
const queuedChunkKeys = new Set();
const chunkLoadQueue = [];
const queuedMeshKeys = new Set();
const chunkMeshQueue = [];
const cloudSeeds = [];

let worldSeed = readSeedFromQuery() ?? randomSeed();
let noiseOffsetX = 0;
let noiseOffsetY = 0;
let noiseOffsetZ = 0;

let waterMesh = null;
let totalVisibleFaces = 0;
let totalSolidBlocks = 0;
let totalTrees = 0;
let totalOreBlocks = 0;
let dayPhase = Math.PI * 0.22;
let hudAccumulator = 0;
let playerVelocityY = 0;
let playerGrounded = false;
let jumpHeldLastFrame = false;
let playerHealth = PLAYER_MAX_HEALTH;
let playerDead = false;
let playerDamageCooldown = 0;
let playerDamageFlash = 0;
let playerDistanceTraveled = 0;
let playerDamageTaken = 0;
let runStartTimeMs = performance.now();
let cameraChunkX = Number.NaN;
let cameraChunkZ = Number.NaN;
let skyDome = null;
let sunSprite = null;
let moonSprite = null;
let starField = null;
let starMaterial = null;
let torchGroup = null;
let torchFlame = null;
let torchGlow = null;
let torchLight = null;
let gunGroup = null;
let gunMuzzleFlash = null;
let gunLight = null;
let combatEffectsGroup = null;
let cloudLayers = [];
let skyUniforms = null;
let cloudDrift = 0;
let waterUniforms = null;
let torchVisibility = 0;
let torchTime = 0;
let gunShootCooldown = 0;
let gunMuzzleFlashTime = 0;
let gunRecoil = 0;
let firingHeld = false;
let zombieSpawnTimer = 0;
let zombieKills = 0;
let shotsFired = 0;
let shotsHit = 0;
let hudErrorMessage = "";
const zombies = [];
const activeProjectiles = [];
const impactParticles = [];

const hud = document.getElementById("hud");
const hudStatusValue = document.getElementById("hud-status-value");
const hudBiomeValue = document.getElementById("hud-biome");
const hudSeedValue = document.getElementById("hud-seed");
const hudChunkValue = document.getElementById("hud-chunk");
const hudPositionValue = document.getElementById("hud-position");
const hudLoadedValue = document.getElementById("hud-loaded");
const hudQueuesValue = document.getElementById("hud-queues");
const hudZombiesValue = document.getElementById("hud-zombies");
const hudKillsValue = document.getElementById("hud-kills");
const hudShotsValue = document.getElementById("hud-shots");
const hudAccuracyValue = document.getElementById("hud-accuracy");
const hudDistanceValue = document.getElementById("hud-distance");
const hudTimeValue = document.getElementById("hud-time");
const hudBlocksValue = document.getElementById("hud-blocks");
const hudFacesValue = document.getElementById("hud-faces");
const hudDecorValue = document.getElementById("hud-decor");
const hudOresValue = document.getElementById("hud-ores");
const healthUi = document.getElementById("health-ui");
const healthFill = document.getElementById("health-fill");
const healthValue = document.getElementById("health-value");
const healthState = document.getElementById("health-state");
const healthPercent = document.getElementById("health-percent");
const damageVignette = document.getElementById("damage-vignette");
const deathScreen = document.getElementById("death-screen");
const deathSummary = document.getElementById("death-summary");
const deathStats = document.getElementById("death-stats");
const deathRespawnButton = document.getElementById("death-respawn");
const deathNewSeedButton = document.getElementById("death-new-seed");

function setHudStatus(message, state = "idle") {
  if (hudStatusValue) {
    hudStatusValue.textContent = message;
    hudStatusValue.dataset.state = state;
  } else if (hud) {
    hud.textContent = message;
  }
}

window.addEventListener("error", (event) => {
  hudErrorMessage = `Runtime error: ${event.message}`;
  setHudStatus(hudErrorMessage, "error");
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
  hudErrorMessage = `Promise error: ${reason}`;
  setHudStatus(hudErrorMessage, "error");
});

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.03;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = DAY_SKY.clone();
scene.fog = new THREE.Fog(0xb8d8ff, FOG_NEAR_DISTANCE, FOG_FAR_DISTANCE);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 700);
camera.position.set(0, MAX_TERRAIN_HEIGHT + 18, 0);

const controls = new PointerLockControls(camera, document.body);
scene.add(camera);

const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(42, 72, 25);
scene.add(sun);

const moon = new THREE.DirectionalLight(0xb8cbff, 0.2);
moon.position.set(-42, -72, -25);
scene.add(moon);

const fillLight = new THREE.HemisphereLight(0xc9e1ff, 0x5f7f4a, 0.7);
scene.add(fillLight);

const moonBounceLight = new THREE.HemisphereLight(0x90abef, 0x263451, 0.0);
scene.add(moonBounceLight);

const clock = new THREE.Clock();
const skyScratch = new THREE.Color();
const fogScratch = new THREE.Color();
const sunDirScratch = new THREE.Vector3();
const moonDirScratch = new THREE.Vector3();
const cloudDummy = new THREE.Object3D();
const upAxis = new THREE.Vector3(0, 1, 0);
const moveForwardScratch = new THREE.Vector3();
const moveRightScratch = new THREE.Vector3();
const moveIntentScratch = new THREE.Vector3();
const lastPlayerPos = new THREE.Vector3();
const playerBoundsScratch = { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
const shotRaycaster = new THREE.Raycaster();
const shotNdc = new THREE.Vector2(0, 0);
const projectileAxis = new THREE.Vector3(0, 1, 0);
const gunMuzzleLocal = new THREE.Vector3(0, 0.03, -0.65);
const gunMuzzleWorldScratch = new THREE.Vector3();
const gunShotDirScratch = new THREE.Vector3();
const gunShotEndScratch = new THREE.Vector3();
const impactNormalScratch = new THREE.Vector3();
const impactVelocityScratch = new THREE.Vector3();
const impactOffsetScratch = new THREE.Vector3();
const terrainRayPointScratch = new THREE.Vector3();
const terrainRayPrevScratch = new THREE.Vector3();
const zombieToPlayerScratch = new THREE.Vector3();
const zombieMoveScratch = new THREE.Vector3();
const biomeBlendScratch = createBiomeBlendState();
const terrainBiomeBlendScratch = createBiomeBlendState();
const terrainMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  roughness: 0.9,
  metalness: 0.03,
});
const chunkWaterMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  transparent: true,
  opacity: 0.76,
  roughness: 0.16,
  metalness: 0.02,
  depthWrite: false,
});
const floraMaterials = createFloraMaterials();

function readSeedFromQuery() {
  const rawSeed = new URLSearchParams(window.location.search).get("seed");
  if (rawSeed === null) return null;
  const parsed = Number.parseInt(rawSeed, 10);
  if (Number.isNaN(parsed)) return null;
  return Math.abs(parsed) >>> 0;
}

function writeSeedToQuery(seed) {
  const url = new URL(window.location.href);
  url.searchParams.set("seed", String(seed));
  window.history.replaceState(null, "", url);
}

function randomSeed() {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function initializeNoiseOffsets() {
  const seededRandom = mulberry32(worldSeed ^ 0x3b6e2f4d);
  noiseOffsetX = seededRandom() * 10000;
  noiseOffsetY = seededRandom() * 10000;
  noiseOffsetZ = seededRandom() * 10000;
}

function createSkyDome() {
  const geometry = new THREE.SphereGeometry(SKY_DOME_RADIUS, 26, 16);
  skyUniforms = {
    topColor: { value: SKY_TOP_DAY.clone() },
    horizonColor: { value: SKY_HORIZON_DAY.clone() },
    bottomColor: { value: SKY_BOTTOM_DAY.clone() },
    sunColor: { value: new THREE.Color(0xfff0bc) },
    sunDirection: { value: new THREE.Vector3(0.2, 1, 0.2).normalize() },
    sunGlowPower: { value: 92.0 },
    moonDirection: { value: new THREE.Vector3(-0.2, -1, -0.2).normalize() },
    moonColor: { value: new THREE.Color(0xabc5ff) },
    moonGlowPower: { value: 82.0 },
    nightStrength: { value: 0.0 },
    time: { value: 0.0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      uniform vec3 sunColor;
      uniform vec3 sunDirection;
      uniform float sunGlowPower;
      uniform vec3 moonDirection;
      uniform vec3 moonColor;
      uniform float moonGlowPower;
      uniform float nightStrength;
      uniform float time;
      varying vec3 vWorldPos;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      void main() {
        vec3 viewDir = normalize(vWorldPos - cameraPosition);
        float h = clamp(viewDir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 base = mix(bottomColor, horizonColor, smoothstep(0.0, 0.48, h));
        base = mix(base, topColor, smoothstep(0.45, 1.0, h));

        float sunAmount = max(dot(viewDir, normalize(sunDirection)), 0.0);
        float sunAttenuation = mix(1.0, 0.24, nightStrength);
        vec3 sunGlow = sunColor * pow(sunAmount, sunGlowPower) * 1.8 * sunAttenuation;

        float moonAmount = max(dot(viewDir, normalize(moonDirection)), 0.0);
        float moonCore = pow(moonAmount, moonGlowPower);
        float moonHalo = pow(moonAmount, 14.0) * 0.36;
        vec3 moonGlow = moonColor * (moonCore * 1.8 + moonHalo) * nightStrength;

        vec3 milkyAxis = normalize(vec3(0.32, 0.91, -0.18));
        float milkyPlane = 1.0 - abs(dot(viewDir, milkyAxis));
        float milkyBand = smoothstep(0.55, 0.98, milkyPlane);
        vec2 milkyUv = vec2(atan(viewDir.z, viewDir.x), viewDir.y) * vec2(2.6, 3.4);
        float milkyNoise = noise(milkyUv + vec2(time * 0.011, 0.0)) * 0.62 +
          noise(milkyUv * 2.15 - vec2(time * 0.017, 0.0)) * 0.38;
        vec3 milkyColor = mix(vec3(0.26, 0.43, 0.86), vec3(0.71, 0.8, 1.0), milkyNoise);
        vec3 milkyGlow = milkyColor * pow(milkyBand, 1.45) * (0.18 + milkyNoise * 0.42) * nightStrength;

        float azimuth = atan(viewDir.z, viewDir.x);
        float auroraBand = smoothstep(0.2, 0.78, h) * (1.0 - smoothstep(0.76, 0.98, h));
        float ribbonA = sin(azimuth * 8.4 + time * 0.16 + viewDir.y * 21.0) * 0.5 + 0.5;
        float ribbonB = sin(azimuth * 3.6 - time * 0.11 + viewDir.y * 29.0) * 0.5 + 0.5;
        float aurora = pow(ribbonA * ribbonB, 2.4) * auroraBand * nightStrength;
        vec3 auroraColor = mix(
          vec3(0.16, 0.95, 0.74),
          vec3(0.5, 0.67, 1.0),
          0.5 + 0.5 * sin(time * 0.06 + azimuth * 2.0)
        );
        vec3 auroraGlow = auroraColor * aurora * 0.32;

        gl_FragColor = vec4(base + sunGlow + moonGlow + milkyGlow + auroraGlow, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });

  skyDome = new THREE.Mesh(geometry, material);
  skyDome.frustumCulled = false;
  scene.add(skyDome);
}

function createDiscTexture(kind) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size * 0.5, size * 0.5, 3, size * 0.5, size * 0.5, size * 0.5);

  if (kind === "moon") {
    gradient.addColorStop(0.0, "rgba(255,255,255,0.97)");
    gradient.addColorStop(0.16, "rgba(228,236,255,0.95)");
    gradient.addColorStop(0.42, "rgba(170,190,238,0.58)");
    gradient.addColorStop(0.74, "rgba(136,164,226,0.24)");
    gradient.addColorStop(1.0, "rgba(100,120,180,0.0)");
  } else {
    gradient.addColorStop(0.0, "rgba(255,255,255,1.0)");
    gradient.addColorStop(0.2, "rgba(255,248,210,0.95)");
    gradient.addColorStop(0.6, "rgba(255,196,112,0.35)");
    gradient.addColorStop(1.0, "rgba(255,140,70,0.0)");
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createTorchGlowTexture() {
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size * 0.5, size * 0.5, 2, size * 0.5, size * 0.5, size * 0.5);
  gradient.addColorStop(0.0, "rgba(255,240,188,1.0)");
  gradient.addColorStop(0.3, "rgba(255,188,104,0.85)");
  gradient.addColorStop(0.62, "rgba(255,126,42,0.35)");
  gradient.addColorStop(1.0, "rgba(255,90,24,0.0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createMuzzleFlashTexture() {
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size * 0.5, size * 0.5, 3, size * 0.5, size * 0.5, size * 0.5);
  gradient.addColorStop(0.0, "rgba(255,255,255,1.0)");
  gradient.addColorStop(0.2, "rgba(255,224,150,0.95)");
  gradient.addColorStop(0.52, "rgba(255,142,52,0.55)");
  gradient.addColorStop(1.0, "rgba(255,80,28,0.0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createCloudTexture(variant = 0) {
  const size = 192;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);

  const blobSets = [
    [
      [56, 98, 44],
      [88, 84, 58],
      [126, 92, 52],
      [156, 106, 36],
      [102, 118, 48],
    ],
    [
      [40, 92, 34],
      [76, 80, 52],
      [112, 78, 60],
      [146, 84, 55],
      [170, 94, 36],
      [118, 112, 46],
    ],
    [
      [70, 80, 38],
      [106, 74, 32],
      [132, 82, 30],
      [90, 110, 56],
      [128, 114, 42],
    ],
  ];

  const blobs = blobSets[variant % blobSets.length];
  const opacityScale = variant === 1 ? 0.82 : variant === 2 ? 0.88 : 0.95;

  for (const blob of blobs) {
    const gradient = ctx.createRadialGradient(blob[0], blob[1], 2, blob[0], blob[1], blob[2]);
    gradient.addColorStop(0, `rgba(255,255,255,${0.92 * opacityScale})`);
    gradient.addColorStop(0.64, `rgba(255,255,255,${0.58 * opacityScale})`);
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(blob[0], blob[1], blob[2], 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCelestialSprites() {
  const sunMaterial = new THREE.SpriteMaterial({
    map: createDiscTexture("sun"),
    color: 0xffefbc,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
  sunSprite = new THREE.Sprite(sunMaterial);
  sunSprite.scale.setScalar(52);
  scene.add(sunSprite);

  const moonMaterial = new THREE.SpriteMaterial({
    map: createDiscTexture("moon"),
    color: 0xc8d7ff,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
  moonSprite = new THREE.Sprite(moonMaterial);
  moonSprite.scale.setScalar(38);
  scene.add(moonSprite);
}

function createPlayerTorch() {
  if (torchGroup) {
    camera.remove(torchGroup);
    torchGroup.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.geometry.dispose();
        if (Array.isArray(node.material)) {
          for (const material of node.material) material.dispose();
        } else {
          node.material.dispose();
        }
      } else if (node instanceof THREE.Sprite) {
        if (node.material.map) node.material.map.dispose();
        node.material.dispose();
      }
    });
  }

  torchGroup = new THREE.Group();
  torchGroup.position.set(-0.34, -0.36, -0.54);
  torchGroup.rotation.set(-0.28, 0.58, -0.24);
  torchGroup.visible = false;

  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.036, 0.56, 9),
    new THREE.MeshStandardMaterial({
      color: 0x6e492b,
      roughness: 0.95,
      metalness: 0.04,
    })
  );
  handle.position.set(0, -0.06, 0);
  torchGroup.add(handle);

  const wrapBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.041, 0.041, 0.12, 10),
    new THREE.MeshStandardMaterial({
      color: 0x4a3a2d,
      roughness: 0.82,
      metalness: 0.1,
    })
  );
  wrapBand.position.set(0, 0.2, 0);
  torchGroup.add(wrapBand);

  const head = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, 0.14, 10),
    new THREE.MeshStandardMaterial({
      color: 0x3f3a36,
      roughness: 0.68,
      metalness: 0.22,
    })
  );
  head.position.set(0, 0.3, 0);
  torchGroup.add(head);

  torchFlame = new THREE.Mesh(
    new THREE.SphereGeometry(0.058, 11, 9),
    new THREE.MeshStandardMaterial({
      color: 0xffab45,
      emissive: 0xff7f28,
      emissiveIntensity: 0.8,
      roughness: 0.28,
      metalness: 0.0,
    })
  );
  torchFlame.position.set(0, 0.39, 0.004);
  torchGroup.add(torchFlame);

  torchGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createTorchGlowTexture(),
      color: 0xffba65,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })
  );
  torchGlow.position.set(0, 0.395, 0.03);
  torchGlow.scale.set(0.01, 0.01, 1);
  torchGroup.add(torchGlow);

  torchLight = new THREE.PointLight(0xffb86a, 0, TORCH_MAX_DISTANCE, 1.85);
  torchLight.position.set(0, 0.38, 0.03);
  torchGroup.add(torchLight);

  camera.add(torchGroup);
  torchVisibility = 0;
  torchTime = 0;
}

function createPlayerGun() {
  if (gunGroup) {
    camera.remove(gunGroup);
    gunGroup.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.geometry.dispose();
        if (Array.isArray(node.material)) {
          for (const material of node.material) material.dispose();
        } else {
          node.material.dispose();
        }
      } else if (node instanceof THREE.Sprite) {
        if (node.material.map) node.material.map.dispose();
        node.material.dispose();
      }
    });
  }

  gunGroup = new THREE.Group();
  gunGroup.position.set(0.36, -0.43, -0.58);
  gunGroup.rotation.set(-0.15, -0.35, 0.06);

  const gunBodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x2f3640,
    roughness: 0.7,
    metalness: 0.32,
  });
  const gunAccentMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a6572,
    roughness: 0.58,
    metalness: 0.42,
  });
  const gripMaterial = new THREE.MeshStandardMaterial({
    color: 0x3c3129,
    roughness: 0.9,
    metalness: 0.08,
  });

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.56), gunBodyMaterial);
  receiver.position.set(0, 0, 0.02);
  gunGroup.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.5, 10), gunAccentMaterial);
  barrel.rotation.x = Math.PI * 0.5;
  barrel.position.set(0, 0.03, -0.38);
  gunGroup.add(barrel);

  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.08, 10), gunBodyMaterial);
  muzzle.rotation.x = Math.PI * 0.5;
  muzzle.position.set(0, 0.03, -0.64);
  gunGroup.add(muzzle);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.2, 0.11), gripMaterial);
  grip.position.set(0, -0.15, 0.16);
  grip.rotation.x = -0.28;
  gunGroup.add(grip);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.09, 0.16), gunAccentMaterial);
  stock.position.set(0, -0.03, 0.34);
  gunGroup.add(stock);

  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.03, 0.035), gunAccentMaterial);
  sight.position.set(0, 0.09, -0.14);
  gunGroup.add(sight);

  gunMuzzleFlash = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createMuzzleFlashTexture(),
      color: 0xffc172,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })
  );
  gunMuzzleFlash.position.set(0, 0.03, -0.72);
  gunMuzzleFlash.scale.set(0.01, 0.01, 1);
  gunGroup.add(gunMuzzleFlash);

  gunLight = new THREE.PointLight(0xffb362, 0, 7.5, 1.9);
  gunLight.position.set(0, 0.03, -0.65);
  gunGroup.add(gunLight);

  camera.add(gunGroup);
  gunShootCooldown = 0;
  gunMuzzleFlashTime = 0;
  gunRecoil = 0;
}

function clearCombatEffects() {
  for (const projectile of activeProjectiles) {
    projectile.active = false;
    projectile.mesh.visible = false;
    projectile.targetZombie = null;
  }

  for (const particle of impactParticles) {
    particle.active = false;
    particle.mesh.visible = false;
  }
}

function createCombatEffects() {
  if (combatEffectsGroup) {
    scene.remove(combatEffectsGroup);
    combatEffectsGroup.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      node.geometry.dispose();
      if (Array.isArray(node.material)) {
        for (const material of node.material) material.dispose();
      } else {
        node.material.dispose();
      }
    });
  }

  combatEffectsGroup = new THREE.Group();
  combatEffectsGroup.frustumCulled = false;
  scene.add(combatEffectsGroup);

  activeProjectiles.length = 0;
  impactParticles.length = 0;

  const projectileGeometry = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
  const projectileMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd08f,
    transparent: true,
    opacity: 0.86,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  for (let i = 0; i < PROJECTILE_POOL_SIZE; i += 1) {
    const mesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
    mesh.visible = false;
    mesh.frustumCulled = false;
    mesh.renderOrder = 12;
    combatEffectsGroup.add(mesh);

    activeProjectiles.push({
      mesh,
      active: false,
      life: 0,
      maxLife: PROJECTILE_MAX_LIFETIME,
      traveled: 0,
      distance: 0,
      damage: 0,
      hitType: 0,
      hitApplied: false,
      targetZombie: null,
      start: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      hitPoint: new THREE.Vector3(),
      hitNormal: new THREE.Vector3(),
    });
  }

  const impactGeometry = new THREE.IcosahedronGeometry(1, 0);
  const impactWorldMaterial = new THREE.MeshBasicMaterial({
    color: 0xd7c19a,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  const impactHitMaterial = new THREE.MeshBasicMaterial({
    color: 0xff7c58,
    transparent: true,
    opacity: 0.94,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  for (let i = 0; i < IMPACT_PARTICLE_POOL_SIZE; i += 1) {
    const mesh = new THREE.Mesh(impactGeometry, impactWorldMaterial);
    mesh.visible = false;
    mesh.frustumCulled = false;
    mesh.renderOrder = 11;
    combatEffectsGroup.add(mesh);

    impactParticles.push({
      mesh,
      active: false,
      life: 0,
      maxLife: 0.45,
      gravity: IMPACT_PARTICLE_GRAVITY,
      drag: 5.5,
      baseScale: 0.05,
      velocity: new THREE.Vector3(),
      spinX: 0,
      spinY: 0,
      spinZ: 0,
      worldMaterial: impactWorldMaterial,
      hitMaterial: impactHitMaterial,
    });
  }

  clearCombatEffects();
}

function getFreeProjectile() {
  for (let i = 0; i < activeProjectiles.length; i += 1) {
    if (!activeProjectiles[i].active) return activeProjectiles[i];
  }
  return activeProjectiles.length > 0 ? activeProjectiles[0] : null;
}

function getFreeImpactParticle() {
  for (let i = 0; i < impactParticles.length; i += 1) {
    if (!impactParticles[i].active) return impactParticles[i];
  }
  return null;
}

function spawnImpactBurst(position, normal, count, isEntityHit) {
  for (let i = 0; i < count; i += 1) {
    const particle = getFreeImpactParticle();
    if (!particle) break;

    const dirX = Math.random() * 2 - 1;
    const dirY = Math.random() * 2 - 1;
    const dirZ = Math.random() * 2 - 1;
    impactVelocityScratch.set(dirX, dirY, dirZ);
    if (impactVelocityScratch.lengthSq() < 1e-5) {
      impactVelocityScratch.set(0, 1, 0);
    } else {
      impactVelocityScratch.normalize();
    }

    if (impactVelocityScratch.dot(normal) < 0) impactVelocityScratch.multiplyScalar(-1);
    const spreadSpeed = isEntityHit ? 4.8 + Math.random() * 5.8 : 2.6 + Math.random() * 4.8;
    impactVelocityScratch.multiplyScalar(spreadSpeed);
    impactVelocityScratch.addScaledVector(normal, isEntityHit ? 2.4 : 1.3);

    particle.active = true;
    particle.life = 0;
    particle.maxLife = (isEntityHit ? 0.22 : 0.32) + Math.random() * 0.34;
    particle.gravity = IMPACT_PARTICLE_GRAVITY * (isEntityHit ? 0.48 : 0.92);
    particle.drag = isEntityHit ? 7.8 : 5.4;
    particle.baseScale = (isEntityHit ? 0.028 : 0.022) + Math.random() * (isEntityHit ? 0.03 : 0.04);
    particle.velocity.copy(impactVelocityScratch);
    particle.spinX = (Math.random() * 2 - 1) * 14;
    particle.spinY = (Math.random() * 2 - 1) * 14;
    particle.spinZ = (Math.random() * 2 - 1) * 14;

    particle.mesh.material = isEntityHit ? particle.hitMaterial : particle.worldMaterial;
    impactOffsetScratch.copy(normal).multiplyScalar(0.05 + Math.random() * 0.08);
    particle.mesh.position.copy(position).add(impactOffsetScratch);
    particle.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    particle.mesh.scale.setScalar(particle.baseScale);
    particle.mesh.visible = true;
  }
}

function spawnProjectile(start, hitPoint, hitNormal, hitType, targetZombie) {
  const projectile = getFreeProjectile();
  if (!projectile) return;

  gunShotDirScratch.copy(hitPoint).sub(start);
  const distance = gunShotDirScratch.length();
  if (distance < 0.001) return;

  projectile.active = true;
  projectile.life = 0;
  projectile.traveled = 0;
  projectile.damage = GUN_DAMAGE;
  projectile.hitType = hitType;
  projectile.hitApplied = false;
  projectile.targetZombie = targetZombie ?? null;
  projectile.start.copy(start);
  projectile.hitPoint.copy(hitPoint);
  projectile.hitNormal.copy(hitNormal);
  projectile.distance = distance;
  projectile.direction.copy(gunShotDirScratch).multiplyScalar(1 / distance);
  projectile.maxLife = Math.min(PROJECTILE_MAX_LIFETIME, distance / PROJECTILE_SPEED + 0.14);

  projectile.mesh.position.copy(start);
  projectile.mesh.quaternion.setFromUnitVectors(projectileAxis, projectile.direction);
  projectile.mesh.scale.set(0.016, PROJECTILE_LENGTH + Math.random() * 0.09, 0.016);
  projectile.mesh.visible = true;
}

function createStarField() {
  if (starField) {
    starField.geometry.dispose();
    if (starMaterial) starMaterial.dispose();
    scene.remove(starField);
    starField = null;
    starMaterial = null;
  }

  const seededRandom = mulberry32(worldSeed ^ 0xc18f4d2b);
  const positions = [];
  const colors = [];
  const sizes = [];
  const phases = [];
  const pulses = [];

  for (let i = 0; i < STAR_COUNT; i += 1) {
    const theta = seededRandom() * Math.PI * 2;
    const y = seededRandom() * 1.22 - 0.14;
    const radial = Math.sqrt(Math.max(0, 1 - y * y));
    const radius = STARFIELD_RADIUS * (0.92 + seededRandom() * 0.08);
    const x = Math.cos(theta) * radial * radius;
    const z = Math.sin(theta) * radial * radius;

    positions.push(x, y * radius, z);

    const tintRoll = seededRandom();
    const intensity = 0.7 + seededRandom() * 0.5;
    let r = 1.0;
    let g = 1.0;
    let b = 1.0;
    if (tintRoll < 0.2) {
      r = 0.82;
      g = 0.9;
      b = 1.0;
    } else if (tintRoll > 0.86) {
      r = 1.0;
      g = 0.92;
      b = 0.82;
    }
    colors.push(r * intensity, g * intensity, b * intensity);

    const giantRoll = seededRandom();
    const starSize = giantRoll > 0.99
      ? 4.4 + seededRandom() * 3.8
      : 1.2 + seededRandom() * 2.6;
    sizes.push(starSize);
    phases.push(seededRandom() * Math.PI * 2);
    pulses.push(0.58 + seededRandom() * 2.6);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute("aPhase", new THREE.Float32BufferAttribute(phases, 1));
  geometry.setAttribute("aPulse", new THREE.Float32BufferAttribute(pulses, 1));

  starMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: `
      attribute vec3 color;
      attribute float aSize;
      attribute float aPhase;
      attribute float aPulse;
      uniform float uTime;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vColor = color;
        float twinkle = 0.68 + sin(uTime * aPulse + aPhase) * 0.32;
        vTwinkle = twinkle;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float distanceScale = 620.0 / max(8.0, -mvPosition.z);
        gl_PointSize = clamp(aSize * twinkle * distanceScale, 1.0, 9.5);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float radiusSq = dot(p, p);
        if (radiusSq > 1.0) discard;
        float core = exp(-radiusSq * 8.8);
        float halo = exp(-radiusSq * 2.0) * 0.56;
        float sparkle = 0.82 + smoothstep(0.58, 1.0, vTwinkle) * 0.34;
        float alpha = (core + halo) * uOpacity * sparkle;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    vertexColors: true,
  });

  starField = new THREE.Points(geometry, starMaterial);
  starField.frustumCulled = false;
  starField.renderOrder = 2;
  scene.add(starField);
}

function initializeCloudSeeds() {
  const seededRandom = mulberry32(worldSeed ^ 0x89b2d13f);
  cloudSeeds.length = 0;
  cloudDrift = 0;

  for (let i = 0; i < CLOUD_COUNT; i += 1) {
    let placedX = 0;
    let placedZ = 0;
    let placedVariant = 0;
    let placedSx = 0;
    let placedSy = 0;
    let placedRadius = 0;
    let placed = false;

    for (let attempt = 0; attempt < 28; attempt += 1) {
      const candidateX = (seededRandom() - 0.5) * CLOUD_FIELD_SIZE;
      const candidateZ = (seededRandom() - 0.5) * CLOUD_FIELD_SIZE;
      const candidateVariant = Math.floor(seededRandom() * CLOUD_VARIANT_COUNT);
      const sizeBase = candidateVariant === 1 ? 110 : candidateVariant === 2 ? 68 : 86;
      const sizeSpan = candidateVariant === 1 ? 120 : candidateVariant === 2 ? 90 : 108;
      const candidateSx = sizeBase + seededRandom() * sizeSpan;
      const candidateSy = candidateSx * (candidateVariant === 1 ? 0.26 + seededRandom() * 0.2 : 0.3 + seededRandom() * 0.25);
      const candidateRadius = candidateSx * 0.42;
      let isFarEnough = true;

      for (let j = 0; j < cloudSeeds.length; j += 1) {
        const existing = cloudSeeds[j];
        const dx = candidateX - existing.x;
        const dz = candidateZ - existing.z;
        const dynamicSeparation = Math.max(
          CLOUD_MIN_SEPARATION,
          (candidateRadius + existing.radius) * 0.64
        );
        if (dx * dx + dz * dz < dynamicSeparation * dynamicSeparation) {
          isFarEnough = false;
          break;
        }
      }

      if (isFarEnough) {
        placedX = candidateX;
        placedZ = candidateZ;
        placedVariant = candidateVariant;
        placedSx = candidateSx;
        placedSy = candidateSy;
        placedRadius = candidateRadius;
        placed = true;
        break;
      }
    }

    if (!placed) continue;

    cloudSeeds.push({
      x: placedX,
      z: placedZ,
      y: CLOUD_ALTITUDE_BASE + seededRandom() * CLOUD_ALTITUDE_RANGE,
      rot: seededRandom() * Math.PI * 2 + (placedVariant - 1) * 0.12,
      sx: placedSx,
      sy: placedSy,
      radius: placedRadius,
      speed: 0.18 + seededRandom() * 0.2,
      variant: placedVariant,
      phase: seededRandom() * Math.PI * 2,
      bob: 0.18 + seededRandom() * 0.8,
      windSkew: (seededRandom() - 0.5) * 0.42,
    });
  }
}

function createCloudLayer() {
  for (const layer of cloudLayers) {
    layer.mesh.geometry.dispose();
    layer.material.map?.dispose();
    layer.material.dispose();
    scene.remove(layer.mesh);
  }
  cloudLayers = [];

  for (let variant = 0; variant < CLOUD_VARIANT_COUNT; variant += 1) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshLambertMaterial({
      map: createCloudTexture(variant),
      transparent: true,
      alphaTest: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
      color: 0xffffff,
    });

    const mesh = new THREE.InstancedMesh(geometry, material, CLOUD_COUNT);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.renderOrder = 3 + variant;
    scene.add(mesh);
    cloudLayers.push({ mesh, material });
  }
}

function wrapCentered(value, size) {
  const half = size * 0.5;
  return ((value + half) % size + size) % size - half;
}

function updateCloudLayer(delta, daylight) {
  if (cloudLayers.length === 0) return;

  cloudDrift += delta * CLOUD_DRIFT_SPEED;
  const driftX = cloudDrift * 4.2;
  const driftZ = cloudDrift * 2.1;
  const counts = Array.from({ length: CLOUD_VARIANT_COUNT }, () => 0);

  for (let i = 0; i < cloudSeeds.length; i += 1) {
    const seed = cloudSeeds[i];
    const layer = cloudLayers[seed.variant];
    if (!layer) continue;
    const variantIndex = counts[seed.variant];
    if (variantIndex >= CLOUD_COUNT) continue;
    counts[seed.variant] += 1;

    const localX = wrapCentered(seed.x + driftX * seed.speed * (1 + seed.windSkew), CLOUD_FIELD_SIZE);
    const localZ = wrapCentered(seed.z + driftZ * seed.speed * (0.7 + seed.windSkew * 0.45), CLOUD_FIELD_SIZE);
    const y = seed.y + Math.sin(cloudDrift * 0.63 * seed.speed + seed.phase) * seed.bob;

    cloudDummy.position.set(camera.position.x + localX, y, camera.position.z + localZ);
    cloudDummy.rotation.set(-Math.PI * 0.5, 0, seed.rot + cloudDrift * seed.speed * 0.04);
    cloudDummy.scale.set(seed.sx, seed.sy, 1);
    cloudDummy.updateMatrix();
    layer.mesh.setMatrixAt(variantIndex, cloudDummy.matrix);
  }

  for (let variant = 0; variant < cloudLayers.length; variant += 1) {
    const layer = cloudLayers[variant];
    layer.mesh.count = counts[variant];
    layer.mesh.instanceMatrix.needsUpdate = true;

    if (layer.material instanceof THREE.MeshLambertMaterial) {
      const variantOpacity = variant === 1 ? 0.84 : variant === 2 ? 0.92 : 1.0;
      layer.material.opacity = (0.06 + daylight * 0.58) * variantOpacity;
      const tint = variant === 1 ? 0.96 : variant === 2 ? 0.92 : 1.0;
      layer.material.color.setRGB(
        (0.4 + daylight * 0.58) * tint,
        (0.44 + daylight * 0.54) * tint,
        (0.52 + daylight * 0.46) * tint
      );
    }
  }
}

function setupAtmosphere() {
  createSkyDome();
  createStarField();
  createCelestialSprites();
  createPlayerTorch();
  createPlayerGun();
  createCombatEffects();
  createCloudLayer();
  initializeCloudSeeds();
}

function chunkKey(cx, cz) {
  return `${cx},${cz}`;
}

function chunkIndex(lx, y, lz) {
  return lx + CHUNK_SIZE_X * (lz + CHUNK_SIZE_Z * y);
}

function chunkColumnIndex(lx, lz) {
  return lx + CHUNK_SIZE_X * lz;
}

function worldToChunkCoord(worldValue, chunkSize) {
  return Math.floor(worldValue / chunkSize);
}

function fract(value) {
  return value - Math.floor(value);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function hash2(x, z) {
  const value = Math.sin(
    (x + noiseOffsetX) * 127.1 +
    (z + noiseOffsetZ) * 311.7 +
    worldSeed * 0.000017
  ) * 43758.5453123;
  return fract(value);
}

function hash3(x, y, z) {
  const value = Math.sin(
    (x + noiseOffsetX) * 157.31 +
    (y + noiseOffsetY) * 113.97 +
    (z + noiseOffsetZ) * 271.79 +
    worldSeed * 0.000013
  ) * 43758.5453123;
  return fract(value);
}

function valueNoise2D(x, z) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const x1 = x0 + 1;
  const z1 = z0 + 1;
  const tx = smoothstep(x - x0);
  const tz = smoothstep(z - z0);

  const v00 = hash2(x0, z0);
  const v10 = hash2(x1, z0);
  const v01 = hash2(x0, z1);
  const v11 = hash2(x1, z1);

  const i0 = lerp(v00, v10, tx);
  const i1 = lerp(v01, v11, tx);
  return lerp(i0, i1, tz);
}

function valueNoise3D(x, y, z) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const z1 = z0 + 1;
  const tx = smoothstep(x - x0);
  const ty = smoothstep(y - y0);
  const tz = smoothstep(z - z0);

  const c000 = hash3(x0, y0, z0);
  const c100 = hash3(x1, y0, z0);
  const c010 = hash3(x0, y1, z0);
  const c110 = hash3(x1, y1, z0);
  const c001 = hash3(x0, y0, z1);
  const c101 = hash3(x1, y0, z1);
  const c011 = hash3(x0, y1, z1);
  const c111 = hash3(x1, y1, z1);

  const x00 = lerp(c000, c100, tx);
  const x10 = lerp(c010, c110, tx);
  const x01 = lerp(c001, c101, tx);
  const x11 = lerp(c011, c111, tx);
  const y0v = lerp(x00, x10, ty);
  const y1v = lerp(x01, x11, ty);
  return lerp(y0v, y1v, tz);
}

function fbm2D(x, z, octaves = 5) {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let normalizer = 0;

  for (let i = 0; i < octaves; i += 1) {
    const sample = valueNoise2D(x * frequency, z * frequency) * 2 - 1;
    sum += sample * amplitude;
    normalizer += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return sum / normalizer;
}

function fbm3D(x, y, z, octaves = 4) {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let normalizer = 0;

  for (let i = 0; i < octaves; i += 1) {
    const sample = valueNoise3D(x * frequency, y * frequency, z * frequency) * 2 - 1;
    sum += sample * amplitude;
    normalizer += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return sum / normalizer;
}

function fitCentered(value, center, radius) {
  return THREE.MathUtils.clamp(1 - Math.abs(value - center) / Math.max(0.0001, radius), 0, 1);
}

function createBiomeBlendState() {
  return {
    temperature: 0,
    moisture: 0,
    ruggedness: 0,
    basinMask: 0,
    volcanicMask: 0,
    blossomMask: 0,
    jungleMask: 0,
    continental: 0,
    macroContinents: 0,
    aridMask: 0,
    dominantBiome: BIOME.PLAINS,
    dominantWeight: 1,
    transition: 0,
    weights: new Float32Array(BIOME_COUNT),
  };
}

function getBiomeBlendAt(worldX, worldZ, riverIntensity = 0, out = createBiomeBlendState()) {
  const climateWarpX = fbm2D((worldX + 260) * 0.00175, (worldZ - 340) * 0.00175, 2) * 68;
  const climateWarpZ = fbm2D((worldX - 520) * 0.00175, (worldZ + 190) * 0.00175, 2) * 68;
  const climateX = worldX + climateWarpX;
  const climateZ = worldZ + climateWarpZ;

  const temperatureRaw = fbm2D((climateX + 380) * 0.0045, (climateZ - 240) * 0.0045, 4) * 0.5 + 0.5;
  const moistureRaw = fbm2D((climateX - 220) * 0.0048, (climateZ + 170) * 0.0048, 4) * 0.5 + 0.5;
  const thermalRegion = fbm2D((climateX + 1150) * 0.0015, (climateZ - 960) * 0.0015, 2) * 0.5 + 0.5;
  const humidityRegion = fbm2D((climateX - 870) * 0.00155, (climateZ + 730) * 0.00155, 2) * 0.5 + 0.5;
  const temperature = THREE.MathUtils.clamp((temperatureRaw * 0.58 + thermalRegion * 0.42 - 0.5) * 1.34 + 0.5, 0, 1);
  const moisture = THREE.MathUtils.clamp((moistureRaw * 0.6 + humidityRegion * 0.4 - 0.5) * 1.3 + 0.5, 0, 1);
  const ruggedness = Math.abs(fbm2D((climateX - 610) * 0.0035, (climateZ + 470) * 0.0035, 3));
  const basinMask = fbm2D((climateX + 190) * 0.00225, (climateZ - 340) * 0.00225, 3) * 0.5 + 0.5;
  const volcanicMask = fbm2D((climateX - 80) * 0.0017, (climateZ + 640) * 0.0017, 3) * 0.5 + 0.5;
  const blossomMask = fbm2D((climateX + 920) * 0.0021, (climateZ - 480) * 0.0021, 3) * 0.5 + 0.5;
  const jungleMask = fbm2D((climateX - 310) * 0.00195, (climateZ + 260) * 0.00195, 2) * 0.5 + 0.5;
  const continental = fbm2D(climateX * 0.00285, climateZ * 0.00285, 4) * 0.5 + 0.5;
  const macroContinents = fbm2D(climateX * 0.0015 - 110, climateZ * 0.0015 + 170, 3) * 0.5 + 0.5;
  const aridMask = fbm2D((climateX + 530) * 0.0025, (climateZ - 730) * 0.0025, 3) * 0.5 + 0.5;

  const dry = 1 - moisture;
  const hot = THREE.MathUtils.smoothstep(temperature, 0.48, 0.82);
  const cold = 1 - THREE.MathUtils.smoothstep(temperature, 0.2, 0.56);
  const temperate = fitCentered(temperature, 0.54, 0.3);
  const lowland = THREE.MathUtils.smoothstep(1 - macroContinents, 0.26, 0.86);
  const highland = THREE.MathUtils.smoothstep(macroContinents, 0.42, 0.9);
  const wetlandBias = THREE.MathUtils.smoothstep(Math.max(riverIntensity, basinMask), 0.2, 0.86);
  const biomeRegionA = fbm2D((climateX - 980) * 0.0015, (climateZ + 620) * 0.0015, 3) * 0.5 + 0.5;
  const biomeRegionB = fbm2D((climateX + 740) * 0.0016, (climateZ - 520) * 0.0016, 3) * 0.5 + 0.5;
  const biomeRegionC = fbm2D((climateX - 430) * 0.0014, (climateZ + 890) * 0.0014, 2) * 0.5 + 0.5;
  const aridRegion = THREE.MathUtils.smoothstep(aridMask * 0.62 + biomeRegionA * 0.38, 0.4, 0.81);
  const humidRegion = THREE.MathUtils.smoothstep(moisture * 0.62 + biomeRegionB * 0.38, 0.38, 0.8);
  const coldRegion = THREE.MathUtils.smoothstep((1 - temperature) * 0.62 + biomeRegionC * 0.38, 0.5, 0.88);
  const warmRegion = THREE.MathUtils.smoothstep(temperature * 0.58 + (1 - biomeRegionC) * 0.42, 0.39, 0.81);
  const jungleRegion = THREE.MathUtils.smoothstep(jungleMask * 0.72 + humidRegion * 0.28, 0.38, 0.86);
  const blossomRegion = THREE.MathUtils.smoothstep(blossomMask * 0.76 + humidRegion * 0.24, 0.46, 0.86);
  const volcanicRegion = THREE.MathUtils.smoothstep(
    volcanicMask * 0.66 + ruggedness * 0.22 + highland * 0.12,
    0.5,
    0.9
  );
  const desertZone = THREE.MathUtils.smoothstep(
    fbm2D((climateX + 1460) * 0.00135, (climateZ - 240) * 0.00135, 2) * 0.5 + 0.5,
    0.54,
    0.86
  );
  const savannaZone = THREE.MathUtils.smoothstep(
    fbm2D((climateX - 760) * 0.0013, (climateZ + 940) * 0.0013, 2) * 0.5 + 0.5,
    0.52,
    0.84
  );
  const badlandsZone = THREE.MathUtils.smoothstep(
    fbm2D((climateX + 410) * 0.00125, (climateZ - 1220) * 0.00125, 2) * 0.5 + 0.5,
    0.56,
    0.87
  );
  const jungleZone = THREE.MathUtils.smoothstep(
    fbm2D((climateX - 1290) * 0.0013, (climateZ + 470) * 0.0013, 2) * 0.5 + 0.5,
    0.5,
    0.83
  );
  const mesaZone = THREE.MathUtils.smoothstep(
    fbm2D((climateX + 830) * 0.00125, (climateZ + 1240) * 0.00125, 2) * 0.5 + 0.5,
    0.55,
    0.86
  );
  const volcanicZone = THREE.MathUtils.smoothstep(
    fbm2D((climateX - 280) * 0.0012, (climateZ - 1360) * 0.0012, 2) * 0.5 + 0.5,
    0.57,
    0.88
  );
  const alpineZone = THREE.MathUtils.smoothstep(
    fbm2D((climateX + 1340) * 0.00125, (climateZ + 760) * 0.00125, 2) * 0.5 + 0.5,
    0.53,
    0.85
  );
  const redwoodZone = THREE.MathUtils.smoothstep(
    fbm2D((climateX - 1640) * 0.0012, (climateZ + 1110) * 0.0012, 2) * 0.5 + 0.5,
    0.53,
    0.84
  );
  const oasisZone = THREE.MathUtils.smoothstep(
    fbm2D((climateX + 1520) * 0.00115, (climateZ - 1470) * 0.00115, 2) * 0.5 + 0.5,
    0.58,
    0.9
  );
  const heathZone = THREE.MathUtils.smoothstep(
    fbm2D((climateX - 1470) * 0.00122, (climateZ - 980) * 0.00122, 2) * 0.5 + 0.5,
    0.52,
    0.86
  );
  const mangroveZone = THREE.MathUtils.smoothstep(
    fbm2D((climateX + 980) * 0.00116, (climateZ - 1180) * 0.00116, 2) * 0.5 + 0.5,
    0.54,
    0.86
  );
  const steppeZone = THREE.MathUtils.smoothstep(
    fbm2D((climateX - 1180) * 0.0012, (climateZ + 1320) * 0.0012, 2) * 0.5 + 0.5,
    0.53,
    0.86
  );
  const glacierZone = THREE.MathUtils.smoothstep(
    fbm2D((climateX + 1710) * 0.00114, (climateZ + 910) * 0.00114, 2) * 0.5 + 0.5,
    0.55,
    0.9
  );
  const semiArid = fitCentered(moisture, 0.34, 0.28);
  const coolTemperate = fitCentered(temperature, 0.44, 0.24);
  const steppeDryBand = fitCentered(moisture, 0.34, 0.24);
  const w = out.weights;

  w[BIOME.PLAINS] =
    0.003 +
    temperate *
      fitCentered(moisture, 0.5, 0.3) *
      fitCentered(ruggedness, 0.26, 0.36) *
      (0.3 + lowland * 0.26) *
      (1 - humidRegion * 0.2) *
      (1 - aridRegion * 0.22) *
      (1 - coldRegion * 0.2);
  w[BIOME.FOREST] =
    0.009 +
    temperate *
      fitCentered(moisture, 0.62, 0.31) *
      fitCentered(ruggedness, 0.34, 0.33) *
      (0.36 + humidRegion * 0.42) *
      (0.36 + continental * 0.46);
  w[BIOME.DESERT] =
    hot *
    THREE.MathUtils.smoothstep(dry, 0.38, 0.82) *
    fitCentered(ruggedness, 0.34, 0.48) *
    (0.62 + aridRegion * 0.78) *
    (1 - riverIntensity * 0.5);
  w[BIOME.ALPINE] =
    cold *
    THREE.MathUtils.smoothstep(ruggedness, 0.48, 0.92) *
    (0.38 + highland * 0.34 + coldRegion * 0.18);
  w[BIOME.SWAMP] =
    THREE.MathUtils.smoothstep(moisture, 0.56, 0.9) *
    fitCentered(ruggedness, 0.22, 0.26) *
    wetlandBias *
    fitCentered(temperature, 0.62, 0.34) *
    (0.5 + humidRegion * 0.62);
  w[BIOME.SAVANNA] =
    hot *
    fitCentered(moisture, 0.42, 0.31) *
    fitCentered(ruggedness, 0.34, 0.33) *
    (0.54 + warmRegion * 0.46 + aridRegion * 0.52);
  w[BIOME.BADLANDS] =
    hot *
    THREE.MathUtils.smoothstep(dry, 0.4, 0.86) *
    THREE.MathUtils.smoothstep(ruggedness, 0.4, 0.86) *
    (0.44 + aridRegion * 0.78);
  w[BIOME.TUNDRA] =
    cold *
    fitCentered(moisture, 0.38, 0.34) *
    fitCentered(ruggedness, 0.36, 0.34) *
    (0.26 + coldRegion * 0.42);
  w[BIOME.JUNGLE] =
    THREE.MathUtils.smoothstep(temperature, 0.5, 0.84) *
    THREE.MathUtils.smoothstep(moisture, 0.52, 0.88) *
    fitCentered(ruggedness, 0.44, 0.38) *
    (0.56 + jungleRegion * 0.84) *
    (0.48 + lowland * 0.6);
  w[BIOME.MESA] =
    hot *
    THREE.MathUtils.smoothstep(dry, 0.36, 0.82) *
    fitCentered(ruggedness, 0.58, 0.32) *
    (0.48 + aridRegion * 0.74);
  w[BIOME.VOLCANIC] =
    volcanicRegion *
    THREE.MathUtils.smoothstep(ruggedness, 0.4, 0.88) *
    fitCentered(moisture, 0.34, 0.45) *
    (0.46 + highland * 0.7);
  w[BIOME.CHERRY_GROVE] =
    temperate *
    THREE.MathUtils.smoothstep(moisture, 0.42, 0.8) *
    fitCentered(ruggedness, 0.3, 0.3) *
    (0.34 + blossomRegion * 0.72);
  w[BIOME.REDWOOD] =
    fitCentered(temperature, 0.48, 0.24) *
    THREE.MathUtils.smoothstep(moisture, 0.5, 0.86) *
    fitCentered(ruggedness, 0.46, 0.3) *
    (0.36 + humidRegion * 0.48 + highland * 0.24) *
    (0.3 + redwoodZone * 0.72);
  w[BIOME.OASIS] =
    hot *
    semiArid *
    fitCentered(ruggedness, 0.26, 0.3) *
    (0.12 + wetlandBias * 1.22 + riverIntensity * 0.74) *
    (0.36 + aridRegion * 0.64) *
    (0.24 + oasisZone * 0.92) *
    (0.52 + lowland * 0.56);
  w[BIOME.HEATH] =
    coolTemperate *
    fitCentered(moisture, 0.38, 0.3) *
    fitCentered(ruggedness, 0.48, 0.3) *
    (0.3 + highland * 0.52 + coldRegion * 0.22) *
    (0.34 + heathZone * 0.72) *
    (1 - humidRegion * 0.24);
  w[BIOME.MANGROVE] =
    THREE.MathUtils.smoothstep(temperature, 0.54, 0.9) *
    THREE.MathUtils.smoothstep(moisture, 0.56, 0.94) *
    fitCentered(ruggedness, 0.2, 0.24) *
    (0.2 + wetlandBias * 1.18 + riverIntensity * 0.72) *
    (0.52 + lowland * 0.58) *
    (0.28 + mangroveZone * 0.82);
  w[BIOME.STEPPE] =
    fitCentered(temperature, 0.5, 0.28) *
    steppeDryBand *
    fitCentered(ruggedness, 0.34, 0.32) *
    (0.36 + aridRegion * 0.42 + warmRegion * 0.2) *
    (0.3 + steppeZone * 0.72) *
    (1 - humidRegion * 0.36);
  w[BIOME.GLACIER] =
    cold *
    THREE.MathUtils.smoothstep(ruggedness, 0.56, 0.96) *
    (0.42 + highland * 0.56 + coldRegion * 0.22) *
    (0.3 + glacierZone * 0.82);

  const extremeArid = aridRegion * hot * THREE.MathUtils.smoothstep(dry, 0.35, 0.78);
  const tropicalWet = humidRegion * warmRegion * THREE.MathUtils.smoothstep(moisture, 0.52, 0.88);
  const temperateWet = humidRegion * temperate * THREE.MathUtils.smoothstep(moisture, 0.46, 0.84);
  const coldHarsh = coldRegion * cold * THREE.MathUtils.smoothstep(ruggedness, 0.5, 0.94);
  const aridHot = aridRegion * hot;
  const oasisPressure = oasisZone * aridHot * (0.2 + wetlandBias * 0.8);
  w[BIOME.DESERT] += extremeArid * 0.08;
  w[BIOME.SAVANNA] += extremeArid * fitCentered(moisture, 0.42, 0.34) * 0.09;
  w[BIOME.BADLANDS] += extremeArid * THREE.MathUtils.smoothstep(ruggedness, 0.34, 0.84) * 0.1;
  w[BIOME.MESA] += extremeArid * fitCentered(ruggedness, 0.56, 0.35) * 0.08;
  w[BIOME.JUNGLE] += tropicalWet * fitCentered(ruggedness, 0.42, 0.42) * 0.11;
  w[BIOME.SWAMP] += tropicalWet * wetlandBias * 0.06;
  w[BIOME.ALPINE] += coldRegion * THREE.MathUtils.smoothstep(ruggedness, 0.42, 0.88) * (0.04 + highland * 0.06);
  w[BIOME.VOLCANIC] += volcanicRegion * THREE.MathUtils.smoothstep(ruggedness, 0.38, 0.86) * 0.08;
  w[BIOME.DESERT] += desertZone * aridHot * THREE.MathUtils.smoothstep(dry, 0.3, 0.75) * 0.16;
  w[BIOME.SAVANNA] += savannaZone * hot * fitCentered(moisture, 0.42, 0.36) * 0.14;
  w[BIOME.BADLANDS] += badlandsZone * aridHot * THREE.MathUtils.smoothstep(ruggedness, 0.28, 0.76) * 0.2;
  w[BIOME.MESA] += mesaZone * aridHot * fitCentered(ruggedness, 0.58, 0.4) * 0.16;
  w[BIOME.JUNGLE] += jungleZone * tropicalWet * fitCentered(ruggedness, 0.42, 0.46) * 0.18;
  w[BIOME.VOLCANIC] += volcanicZone * highland * THREE.MathUtils.smoothstep(ruggedness, 0.34, 0.82) * 0.18;
  w[BIOME.ALPINE] += alpineZone * coldRegion * THREE.MathUtils.smoothstep(ruggedness, 0.38, 0.84) * 0.12;
  w[BIOME.REDWOOD] += redwoodZone * temperateWet * fitCentered(ruggedness, 0.46, 0.34) * 0.22;
  w[BIOME.OASIS] += oasisPressure * fitCentered(ruggedness, 0.24, 0.34) * 0.26;
  w[BIOME.HEATH] += heathZone * (coldRegion * 0.54 + temperate * 0.42) * semiArid * 0.2;
  w[BIOME.MANGROVE] += mangroveZone * tropicalWet * wetlandBias * 0.22;
  w[BIOME.STEPPE] += steppeZone * fitCentered(temperature, 0.48, 0.3) * steppeDryBand * 0.16;
  w[BIOME.GLACIER] += glacierZone * coldHarsh * (0.16 + highland * 0.18);
  const oasisInfluence = THREE.MathUtils.clamp(w[BIOME.OASIS], 0, 1);
  const mangroveInfluence = THREE.MathUtils.clamp(w[BIOME.MANGROVE], 0, 1);
  const glacierInfluence = THREE.MathUtils.clamp(w[BIOME.GLACIER], 0, 1);
  w[BIOME.DESERT] *= 1 - oasisInfluence * 0.32;
  w[BIOME.SAVANNA] *= 1 - oasisInfluence * 0.18;
  w[BIOME.BADLANDS] *= 1 - oasisInfluence * 0.12;
  w[BIOME.SWAMP] *= 1 - mangroveInfluence * 0.18;
  w[BIOME.JUNGLE] *= 1 - mangroveInfluence * 0.14;
  w[BIOME.ALPINE] *= 1 - glacierInfluence * 0.18;
  w[BIOME.FOREST] *= 1 - THREE.MathUtils.clamp(w[BIOME.REDWOOD] * 0.18, 0, 0.24);
  w[BIOME.TUNDRA] *= 0.78;

  const specialtyPressure =
    w[BIOME.DESERT] +
    w[BIOME.ALPINE] +
    w[BIOME.SWAMP] +
    w[BIOME.SAVANNA] +
    w[BIOME.BADLANDS] +
    w[BIOME.TUNDRA] +
    w[BIOME.JUNGLE] +
    w[BIOME.MESA] +
    w[BIOME.VOLCANIC] +
    w[BIOME.CHERRY_GROVE] +
    w[BIOME.REDWOOD] +
    w[BIOME.OASIS] +
    w[BIOME.HEATH] +
    w[BIOME.MANGROVE] +
    w[BIOME.STEPPE] +
    w[BIOME.GLACIER];
  w[BIOME.PLAINS] *= 1 - THREE.MathUtils.clamp(specialtyPressure * 0.24, 0, 0.74);

  let sum = 0;
  for (let i = 0; i < BIOME_COUNT; i += 1) {
    w[i] = Math.max(0, w[i]);
    sum += w[i];
  }

  if (sum <= 1e-6) {
    w.fill(0);
    w[BIOME.PLAINS] = 1;
    out.temperature = temperature;
    out.moisture = moisture;
    out.ruggedness = ruggedness;
    out.basinMask = basinMask;
    out.volcanicMask = volcanicMask;
    out.blossomMask = blossomMask;
    out.jungleMask = jungleMask;
    out.continental = continental;
    out.macroContinents = macroContinents;
    out.aridMask = aridMask;
    out.dominantBiome = BIOME.PLAINS;
    out.dominantWeight = 1;
    out.transition = 0;
    return out;
  }

  let shapedSum = 0;
  for (let i = 0; i < BIOME_COUNT; i += 1) {
    const normalized = w[i] / sum;
    let shapedWeight = normalized;
    if (i === BIOME.PLAINS) {
      shapedWeight *= 0.62;
    } else {
      shapedWeight *= 1.06 + normalized * 0.35;
      if (normalized < 0.012) shapedWeight *= 0.7;
    }
    w[i] = shapedWeight;
    shapedSum += shapedWeight;
  }

  if (shapedSum <= 1e-6) {
    w.fill(0);
    w[BIOME.PLAINS] = 1;
    out.temperature = temperature;
    out.moisture = moisture;
    out.ruggedness = ruggedness;
    out.basinMask = basinMask;
    out.volcanicMask = volcanicMask;
    out.blossomMask = blossomMask;
    out.jungleMask = jungleMask;
    out.continental = continental;
    out.macroContinents = macroContinents;
    out.aridMask = aridMask;
    out.dominantBiome = BIOME.PLAINS;
    out.dominantWeight = 1;
    out.transition = 0;
    return out;
  }

  let dominantBiome = BIOME.PLAINS;
  let dominantWeight = -1;
  let secondaryWeight = 0;
  for (let i = 0; i < BIOME_COUNT; i += 1) {
    const normalized = w[i] / shapedSum;
    w[i] = normalized;
    if (normalized > dominantWeight) {
      secondaryWeight = dominantWeight;
      dominantWeight = normalized;
      dominantBiome = i;
    } else if (normalized > secondaryWeight) {
      secondaryWeight = normalized;
    }
  }

  out.temperature = temperature;
  out.moisture = moisture;
  out.ruggedness = ruggedness;
  out.basinMask = basinMask;
  out.volcanicMask = volcanicMask;
  out.blossomMask = blossomMask;
  out.jungleMask = jungleMask;
  out.continental = continental;
  out.macroContinents = macroContinents;
  out.aridMask = aridMask;
  out.dominantBiome = dominantBiome;
  out.dominantWeight = dominantWeight;
  out.transition = THREE.MathUtils.clamp(secondaryWeight / Math.max(0.001, dominantWeight), 0, 1);
  return out;
}

function getBiomeAt(worldX, worldZ, riverIntensity = 0) {
  return getBiomeBlendAt(worldX, worldZ, riverIntensity, biomeBlendScratch).dominantBiome;
}

function getRiverIntensity(worldX, worldZ) {
  const warpX = fbm2D((worldX + 330) * 0.0029, (worldZ - 210) * 0.0029, 2) * 28;
  const warpZ = fbm2D((worldX - 470) * 0.0029, (worldZ + 110) * 0.0029, 2) * 28;
  const x = worldX + warpX;
  const z = worldZ + warpZ;
  const trunk = Math.abs(fbm2D((x + 140) * 0.0062, (z - 90) * 0.0062, 4));
  const branch = Math.abs(fbm2D((x - 420) * 0.012, (z + 310) * 0.012, 3));
  const meander = Math.abs(fbm2D((x + 780) * 0.0032, (z - 650) * 0.0032, 2));
  const channelDistance = trunk * 0.56 + branch * 0.29 + meander * 0.15;
  const river = THREE.MathUtils.clamp((0.19 - channelDistance) / 0.19, 0, 1);
  return THREE.MathUtils.smoothstep(river, 0, 1);
}

function getRiverWaterSurfaceY(worldX, worldZ, terrainHeight, biome, riverIntensity) {
  let waterSurfaceY = -1;

  if (riverIntensity > RIVER_WATER_MIN_INTENSITY && terrainHeight <= SEA_LEVEL + 4) {
    const localOffset = Math.round(
      fbm2D((worldX + 170) * 0.0082, (worldZ - 260) * 0.0082, 2)
    );
    const streamSurfaceY = SEA_LEVEL + 1 + THREE.MathUtils.clamp(localOffset, -1, 1);
    waterSurfaceY = Math.max(waterSurfaceY, streamSurfaceY);
  }

  if (biome === BIOME.SWAMP && terrainHeight <= SEA_LEVEL + 3) {
    const swampSurfaceY = SEA_LEVEL + (riverIntensity > 0.62 ? 2 : 1);
    waterSurfaceY = Math.max(waterSurfaceY, swampSurfaceY);
  }

  if (biome === BIOME.OASIS && terrainHeight <= SEA_LEVEL + 5) {
    const oasisSurfaceY = SEA_LEVEL + (riverIntensity > 0.58 ? 2 : 1);
    waterSurfaceY = Math.max(waterSurfaceY, oasisSurfaceY);
  }

  if (biome === BIOME.MANGROVE && terrainHeight <= SEA_LEVEL + 4) {
    const mangroveSurfaceY = SEA_LEVEL + (riverIntensity > 0.52 ? 2 : 1);
    waterSurfaceY = Math.max(waterSurfaceY, mangroveSurfaceY);
  }

  if (waterSurfaceY < 0 && terrainHeight <= SEA_LEVEL + 3) {
    const lakeMask = fbm2D((worldX + 910) * 0.0021, (worldZ - 740) * 0.0021, 3) * 0.5 + 0.5;
    if (lakeMask > 0.85) {
      waterSurfaceY = SEA_LEVEL + 1;
    }
  }

  if (waterSurfaceY < 0 && biome === BIOME.OASIS && terrainHeight <= SEA_LEVEL + 5) {
    const oasisLakeMask = fbm2D((worldX - 540) * 0.0026, (worldZ + 680) * 0.0026, 3) * 0.5 + 0.5;
    if (oasisLakeMask > 0.78) {
      waterSurfaceY = SEA_LEVEL + 1;
    }
  }

  if (waterSurfaceY < 0 && biome === BIOME.MANGROVE && terrainHeight <= SEA_LEVEL + 4) {
    const mangroveLakeMask = fbm2D((worldX + 640) * 0.0024, (worldZ - 520) * 0.0024, 3) * 0.5 + 0.5;
    if (mangroveLakeMask > 0.72) {
      waterSurfaceY = SEA_LEVEL + 1;
    }
  }

  return THREE.MathUtils.clamp(waterSurfaceY, -1, WORLD_HEIGHT - 2);
}

function getTerrainHeight(worldX, worldZ, biome, riverIntensity = 0, biomeBlend = null) {
  const blend = biomeBlend ?? getBiomeBlendAt(worldX, worldZ, riverIntensity, terrainBiomeBlendScratch);
  const weights = blend.weights;
  const plainsW = weights[BIOME.PLAINS];
  const forestW = weights[BIOME.FOREST];
  const desertW = weights[BIOME.DESERT];
  const alpineW = weights[BIOME.ALPINE];
  const swampW = weights[BIOME.SWAMP];
  const savannaW = weights[BIOME.SAVANNA];
  const badlandsW = weights[BIOME.BADLANDS];
  const tundraW = weights[BIOME.TUNDRA];
  const jungleW = weights[BIOME.JUNGLE];
  const mesaW = weights[BIOME.MESA];
  const volcanicW = weights[BIOME.VOLCANIC];
  const cherryW = weights[BIOME.CHERRY_GROVE];
  const redwoodW = weights[BIOME.REDWOOD];
  const oasisW = weights[BIOME.OASIS];
  const heathW = weights[BIOME.HEATH];
  const mangroveW = weights[BIOME.MANGROVE];
  const steppeW = weights[BIOME.STEPPE];
  const glacierW = weights[BIOME.GLACIER];

  const warpX = fbm2D((worldX + 420) * 0.0078, (worldZ - 260) * 0.0078, 2) * 18;
  const warpZ = fbm2D((worldX - 590) * 0.0078, (worldZ + 310) * 0.0078, 2) * 18;
  const sampleX = worldX + warpX;
  const sampleZ = worldZ + warpZ;

  const macroLocal = fbm2D(sampleX * 0.0032 - 180, sampleZ * 0.0032 + 250, 5) * 0.5 + 0.5;
  const macroContinents = blend.macroContinents * 0.6 + macroLocal * 0.4;
  const continental = blend.continental * 0.55 + (fbm2D(sampleX * 0.0088, sampleZ * 0.0088, 4) * 0.5 + 0.5) * 0.45;
  const hills = fbm2D(sampleX * 0.02 + 170, sampleZ * 0.02 - 210, 3) * 0.5 + 0.5;
  const uplands = fbm2D(sampleX * 0.011 - 90, sampleZ * 0.011 + 60, 3) * 0.5 + 0.5;
  const micro = fbm2D(sampleX * 0.06 - 90, sampleZ * 0.06 + 60, 2) * 0.5 + 0.5;
  const ridgeField = Math.abs(fbm2D(sampleX * 0.034 - 450, sampleZ * 0.034 + 290, 4));
  const ridgeBand = THREE.MathUtils.smoothstep(ridgeField, 0.4, 0.88);
  const mountainRegion = THREE.MathUtils.smoothstep(
    fbm2D(sampleX * 0.0046 + 760, sampleZ * 0.0046 - 910, 3) * 0.5 + 0.5,
    0.56,
    0.86
  );
  const reliefNoise = fbm2D(sampleX * 0.055 + 90, sampleZ * 0.055 - 170, 2) * 0.5 + 0.5;
  const redwoodHills = fbm2D(sampleX * 0.013 + 340, sampleZ * 0.013 - 510, 3) * 0.5 + 0.5;
  const oasisBasins = THREE.MathUtils.smoothstep(
    fbm2D(sampleX * 0.014 - 620, sampleZ * 0.014 + 470, 3) * 0.5 + 0.5,
    0.6,
    0.93
  );
  const mangroveBasins = THREE.MathUtils.smoothstep(
    fbm2D(sampleX * 0.016 + 440, sampleZ * 0.016 - 360, 3) * 0.5 + 0.5,
    0.57,
    0.9
  );
  const steppeRoll = fbm2D(sampleX * 0.015 - 260, sampleZ * 0.015 + 150, 3) * 0.5 + 0.5;
  const glacierSpines = THREE.MathUtils.smoothstep(
    Math.abs(fbm2D(sampleX * 0.03 + 210, sampleZ * 0.03 - 380, 3)),
    0.4,
    0.86
  );
  const heathRidges = THREE.MathUtils.smoothstep(
    Math.abs(fbm2D(sampleX * 0.028 + 310, sampleZ * 0.028 - 440, 3)),
    0.34,
    0.82
  );

  const reliefWeight =
    glacierW * 0.66 +
    alpineW * 0.48 +
    volcanicW * 0.52 +
    badlandsW * 0.31 +
    mesaW * 0.28 +
    heathW * 0.24 +
    redwoodW * 0.2 +
    steppeW * 0.08 +
    tundraW * 0.2 +
    jungleW * 0.14 +
    forestW * 0.08 +
    savannaW * 0.07 -
    mangroveW * 0.48 -
    oasisW * 0.34 -
    swampW * 0.46 -
    plainsW * 0.08 -
    desertW * 0.1;

  let shaped = macroContinents * 0.5 + continental * 0.26 + hills * 0.16 + micro * 0.08;
  shaped += (uplands - 0.5) * (0.16 + Math.max(0, reliefWeight) * 0.15);
  shaped += mountainRegion * (0.08 + reliefWeight * 0.24 + ridgeBand * (0.08 + alpineW * 0.22 + volcanicW * 0.2));
  shaped +=
    ridgeBand *
    (alpineW * 0.12 + volcanicW * 0.14 + badlandsW * 0.1 + mesaW * 0.08 + tundraW * 0.05 + heathW * 0.08 + redwoodW * 0.05 + glacierW * 0.2 + steppeW * 0.04);
  shaped += (reliefNoise - 0.5) * (0.04 + Math.max(0, reliefWeight) * 0.06);
  shaped += (redwoodHills - 0.5) * (redwoodW * 0.14 + heathW * 0.08);
  shaped += heathRidges * (heathW * 0.13 + redwoodW * 0.03);
  shaped += glacierSpines * (glacierW * 0.2 + alpineW * 0.08);
  shaped += (steppeRoll - 0.5) * (steppeW * 0.1 + plainsW * 0.03);
  shaped -= mangroveW * (0.24 + mangroveBasins * 0.22 + ridgeBand * 0.16);
  shaped -= oasisW * (0.2 + oasisBasins * 0.26 + ridgeBand * 0.1);
  shaped += mangroveW * (uplands - 0.5) * 0.02;
  shaped += oasisW * (uplands - 0.5) * 0.03;
  shaped -= swampW * (0.18 + ridgeBand * 0.24);
  shaped -= plainsW * Math.max(0, ridgeBand - 0.58) * 0.05;

  const terraceStrength = THREE.MathUtils.clamp(
    desertW * 0.24 + mesaW * 0.46 + badlandsW * 0.4 + volcanicW * 0.08 - swampW * 0.2 - redwoodW * 0.16 - oasisW * 0.25 - heathW * 0.18 - mangroveW * 0.3 - steppeW * 0.08 - glacierW * 0.16,
    0,
    0.65
  );
  if (terraceStrength > 0.01) {
    const terraceSteps = Math.max(5, Math.round(8 + mesaW * 5 + badlandsW * 3 + desertW * 2 + volcanicW * 2));
    const terraced = Math.floor(shaped * terraceSteps) / terraceSteps;
    const terraceMask = THREE.MathUtils.smoothstep(shaped, 0.18, 0.88);
    shaped = THREE.MathUtils.lerp(shaped, terraced, terraceStrength * terraceMask);
  }

  shaped = THREE.MathUtils.clamp(shaped, 0, 1);
  shaped = THREE.MathUtils.smoothstep(shaped, 0, 1);

  let biomeMin =
    MIN_TERRAIN_HEIGHT +
    glacierW * 4.2 +
    redwoodW * 2.2 +
    heathW * 2.4 +
    steppeW * 0.8 +
    mangroveW * 0.2 +
    oasisW * 0.3 +
    tundraW * 1.6 +
    alpineW * 2.8 +
    badlandsW * 1.8 +
    mesaW * 3.8 +
    volcanicW * 4.6 +
    jungleW * 0.8;
  biomeMin = THREE.MathUtils.lerp(biomeMin, SEA_LEVEL - 0.8, Math.pow(swampW, 0.86));
  biomeMin = THREE.MathUtils.lerp(biomeMin, SEA_LEVEL - 0.6, Math.pow(mangroveW, 0.82));
  biomeMin = THREE.MathUtils.lerp(biomeMin, SEA_LEVEL - 0.3, Math.pow(oasisW, 0.78));

  let biomeMax =
    MAX_TERRAIN_HEIGHT +
    8 +
    glacierW * 30 +
    plainsW * 1.5 +
    forestW * 4 +
    redwoodW * 12 +
    heathW * 11 +
    steppeW * 6.5 +
    mangroveW * 4 +
    oasisW * 3.8 +
    savannaW * 4.5 +
    jungleW * 8 +
    tundraW * 9 +
    alpineW * 22 +
    badlandsW * 15 +
    mesaW * 17 +
    volcanicW * 24 +
    cherryW * 6 +
    desertW * 2;
  biomeMax = THREE.MathUtils.lerp(biomeMax, SEA_LEVEL + 8.2, Math.pow(swampW, 0.92));
  biomeMax = THREE.MathUtils.lerp(biomeMax, SEA_LEVEL + 9.8, Math.pow(mangroveW, 0.82));
  biomeMax = THREE.MathUtils.lerp(biomeMax, SEA_LEVEL + 12.4, Math.pow(oasisW, 0.8));

  const valleyStrength = THREE.MathUtils.clamp(
    mountainRegion * (0.58 + reliefWeight * 0.22) +
    ridgeBand * (0.26 + alpineW * 0.2 + volcanicW * 0.16 + heathW * 0.08 + redwoodW * 0.04 + glacierW * 0.16 + steppeW * 0.05),
    0,
    1
  );
  let riverDepthMax =
    5.2 +
    valleyStrength * 8.4 +
    glacierW * 2.7 +
    alpineW * 2 +
    badlandsW * 1.8 +
    jungleW * 1.3 +
    redwoodW * 1.1 +
    steppeW * 0.4 +
    heathW * 0.8 +
    tundraW * 0.9 -
    mangroveW * 4.4 -
    oasisW * 3.4 -
    mesaW * 1.3 -
    volcanicW * 0.9 -
    swampW * 4.6;
  riverDepthMax = Math.max(0.5, riverDepthMax);
  const riverCurve = 1.08 + swampW * 0.58 + mangroveW * 0.3 + plainsW * 0.14 + steppeW * 0.06 + oasisW * 0.22 - alpineW * 0.08 - glacierW * 0.08;
  let riverDepth = lerp(0, riverDepthMax, Math.pow(riverIntensity, riverCurve));
  if (swampW > 0.4) {
    const swampSuppression = THREE.MathUtils.lerp(
      0.52,
      0.2,
      THREE.MathUtils.clamp((swampW - 0.4) / 0.6, 0, 1)
    );
    riverDepth *= swampSuppression;
  }
  if (mangroveW > 0.34) {
    const mangroveSuppression = THREE.MathUtils.lerp(
      0.68,
      0.32,
      THREE.MathUtils.clamp((mangroveW - 0.34) / 0.66, 0, 1)
    );
    riverDepth *= mangroveSuppression;
  }
  if (oasisW > 0.36) {
    const oasisSuppression = THREE.MathUtils.lerp(
      0.78,
      0.44,
      THREE.MathUtils.clamp((oasisW - 0.36) / 0.64, 0, 1)
    );
    riverDepth *= oasisSuppression;
  }

  const spireMask = THREE.MathUtils.smoothstep(
    fbm2D(sampleX * 0.018 + 50, sampleZ * 0.018 - 110, 2) * 0.5 + 0.5,
    0.86,
    0.98
  );
  const spireSuppression = 1 - THREE.MathUtils.clamp(swampW * 0.9 + mangroveW * 0.5 + oasisW * 0.35, 0, 0.94);
  const spireScale =
    (glacierW * 5.4 + alpineW * 3.8 + volcanicW * 4.8 + badlandsW * 2.8 + mesaW * 2.5 + jungleW * 1.1 + redwoodW * 1.4 + heathW * 1.6 + steppeW * 0.6) *
    spireSuppression;
  const spireBonus = Math.floor(spireMask * spireScale);

  let terrainHeight = Math.floor(lerp(biomeMin, biomeMax, shaped) + spireBonus - riverDepth);

  if (biome === BIOME.SWAMP || swampW > 0.56) {
    terrainHeight = THREE.MathUtils.clamp(terrainHeight, SEA_LEVEL - 1, SEA_LEVEL + 7);
  }
  if (biome === BIOME.MANGROVE || mangroveW > 0.56) {
    terrainHeight = THREE.MathUtils.clamp(terrainHeight, SEA_LEVEL - 1, SEA_LEVEL + 8);
  }
  if (biome === BIOME.OASIS || oasisW > 0.56) {
    terrainHeight = THREE.MathUtils.clamp(terrainHeight, SEA_LEVEL - 1, SEA_LEVEL + 14);
  }
  if (biome === BIOME.REDWOOD && redwoodW > 0.5) {
    terrainHeight = Math.max(terrainHeight, SEA_LEVEL + 2);
  }
  if (biome === BIOME.HEATH && heathW > 0.52) {
    terrainHeight = Math.max(terrainHeight, SEA_LEVEL + 1);
  }
  if (biome === BIOME.STEPPE && steppeW > 0.54) {
    terrainHeight = Math.max(terrainHeight, SEA_LEVEL + 1);
  }
  if (biome === BIOME.GLACIER || glacierW > 0.54) {
    terrainHeight = Math.max(terrainHeight, SEA_LEVEL + 7);
  }

  return THREE.MathUtils.clamp(terrainHeight, 4, WORLD_HEIGHT - 2);
}

function getSurfaceBlock(biome, terrainHeight, riverIntensity) {
  const nearWater = terrainHeight <= SEA_LEVEL + 1;
  if (biome === BIOME.VOLCANIC) {
    if (terrainHeight > SEA_LEVEL + 10) return BLOCK.BASALT;
    return BLOCK.ASH;
  }
  if (biome === BIOME.MESA) {
    if (terrainHeight > SEA_LEVEL + 13) return BLOCK.BASALT;
    return BLOCK.RED_SAND;
  }
  if (biome === BIOME.BADLANDS) {
    if (terrainHeight > SEA_LEVEL + 11) return BLOCK.BASALT;
    return BLOCK.RED_SAND;
  }
  if (biome === BIOME.JUNGLE) {
    if (nearWater || riverIntensity > 0.4) return BLOCK.SAND;
    return BLOCK.MOSS;
  }
  if (biome === BIOME.SWAMP) {
    if (riverIntensity > 0.72 && terrainHeight <= SEA_LEVEL + 2) return BLOCK.DIRT;
    if (terrainHeight <= SEA_LEVEL + 3) return BLOCK.MOSS;
    if (riverIntensity > 0.62 && terrainHeight <= SEA_LEVEL + 4) return BLOCK.DIRT;
    return BLOCK.GRASS;
  }
  if (biome === BIOME.MANGROVE) {
    if (terrainHeight <= SEA_LEVEL + 3 || riverIntensity > 0.32) return BLOCK.MOSS;
    if (terrainHeight <= SEA_LEVEL + 5) return BLOCK.DIRT;
    return BLOCK.GRASS;
  }
  if (biome === BIOME.REDWOOD) {
    if (terrainHeight <= SEA_LEVEL + 4 || riverIntensity > 0.4) return BLOCK.MOSS;
    return BLOCK.GRASS;
  }
  if (biome === BIOME.OASIS) {
    if (nearWater || riverIntensity > 0.34) return BLOCK.MOSS;
    if (terrainHeight <= SEA_LEVEL + 5 && riverIntensity > 0.2) return BLOCK.GRASS;
    return BLOCK.SAND;
  }
  if (biome === BIOME.HEATH) {
    if (terrainHeight > SEA_LEVEL + 18) return BLOCK.SNOW;
    if (terrainHeight > SEA_LEVEL + 10 && riverIntensity < 0.22) return BLOCK.STONE;
    return BLOCK.GRASS;
  }
  if (biome === BIOME.STEPPE) {
    if (terrainHeight > SEA_LEVEL + 14 && riverIntensity < 0.2) return BLOCK.STONE;
    return BLOCK.GRASS;
  }
  if (biome === BIOME.GLACIER) {
    if (terrainHeight >= SEA_LEVEL + 2) return BLOCK.SNOW;
    return BLOCK.STONE;
  }
  if (biome === BIOME.CHERRY_GROVE) {
    if (nearWater || riverIntensity > 0.3) return BLOCK.SAND;
    return BLOCK.GRASS;
  }
  if (nearWater || biome === BIOME.DESERT || riverIntensity > 0.28) return BLOCK.SAND;
  if (biome === BIOME.ALPINE && terrainHeight >= SEA_LEVEL + 5) return BLOCK.SNOW;
  if (biome === BIOME.TUNDRA && terrainHeight >= SEA_LEVEL + 3) return BLOCK.SNOW;
  return BLOCK.GRASS;
}

function getSubSurfaceBlock(biome, terrainHeight, riverIntensity) {
  const nearWater = terrainHeight <= SEA_LEVEL + 1;
  if (biome === BIOME.VOLCANIC) return BLOCK.BASALT;
  if (biome === BIOME.MESA) {
    if (terrainHeight > SEA_LEVEL + 10) return BLOCK.BASALT;
    return BLOCK.RED_SAND;
  }
  if (biome === BIOME.BADLANDS) {
    if (terrainHeight > SEA_LEVEL + 8 && riverIntensity < 0.3) return BLOCK.BASALT;
    return BLOCK.RED_SAND;
  }
  if (biome === BIOME.JUNGLE) {
    if (nearWater && riverIntensity > 0.36) return BLOCK.SAND;
    return BLOCK.DIRT;
  }
  if (biome === BIOME.SWAMP) {
    if (terrainHeight <= SEA_LEVEL + 2 && riverIntensity > 0.66) return BLOCK.DIRT;
    if (terrainHeight <= SEA_LEVEL + 2) return BLOCK.MOSS;
    return BLOCK.DIRT;
  }
  if (biome === BIOME.MANGROVE) {
    if (terrainHeight <= SEA_LEVEL + 3 || riverIntensity > 0.34) return BLOCK.DIRT;
    return BLOCK.MOSS;
  }
  if (biome === BIOME.REDWOOD) {
    if (terrainHeight <= SEA_LEVEL + 3 && riverIntensity > 0.34) return BLOCK.MOSS;
    return BLOCK.DIRT;
  }
  if (biome === BIOME.OASIS) {
    if (nearWater || riverIntensity > 0.34) return BLOCK.DIRT;
    return BLOCK.SAND;
  }
  if (biome === BIOME.HEATH) {
    if (terrainHeight > SEA_LEVEL + 13 && riverIntensity < 0.24) return BLOCK.STONE;
    return BLOCK.DIRT;
  }
  if (biome === BIOME.STEPPE) {
    if (terrainHeight > SEA_LEVEL + 12 && riverIntensity < 0.22) return BLOCK.STONE;
    return BLOCK.DIRT;
  }
  if (biome === BIOME.GLACIER) {
    if (terrainHeight > SEA_LEVEL + 4) return BLOCK.STONE;
    return BLOCK.DIRT;
  }
  if (biome === BIOME.CHERRY_GROVE) return BLOCK.DIRT;
  if (nearWater || biome === BIOME.DESERT || riverIntensity > 0.24) return BLOCK.SAND;
  return BLOCK.DIRT;
}

function shouldCarveCave(worldX, y, worldZ) {
  const tunnels = fbm3D((worldX + 70) * 0.082, y * 0.1, (worldZ - 55) * 0.082, 3);
  const pockets = fbm3D((worldX - 120) * 0.15, (y + 30) * 0.14, (worldZ + 90) * 0.15, 2);
  const depthFactor = THREE.MathUtils.clamp((SEA_LEVEL + 12 - y) / 20, 0, 1);
  return tunnels > 0.27 + depthFactor * 0.09 && Math.abs(pockets) < 0.24;
}

function getLocalBlock(data, lx, y, lz) {
  if (
    lx < 0 || lx >= CHUNK_SIZE_X ||
    lz < 0 || lz >= CHUNK_SIZE_Z ||
    y < 0 || y >= WORLD_HEIGHT
  ) {
    return BLOCK.AIR;
  }
  return data[chunkIndex(lx, y, lz)];
}

function setLocalBlock(data, lx, y, lz, type) {
  if (
    lx < 0 || lx >= CHUNK_SIZE_X ||
    lz < 0 || lz >= CHUNK_SIZE_Z ||
    y < 0 || y >= WORLD_HEIGHT
  ) {
    return;
  }
  data[chunkIndex(lx, y, lz)] = type;
}

function isColumnFlatEnoughInChunk(columnHeights, lx, lz, topY) {
  if (lx <= 0 || lx >= CHUNK_SIZE_X - 1 || lz <= 0 || lz >= CHUNK_SIZE_Z - 1) return false;

  const neighbors = [
    columnHeights[chunkColumnIndex(lx - 1, lz)],
    columnHeights[chunkColumnIndex(lx + 1, lz)],
    columnHeights[chunkColumnIndex(lx, lz - 1)],
    columnHeights[chunkColumnIndex(lx, lz + 1)],
  ];

  for (const neighborHeight of neighbors) {
    if (Math.abs(neighborHeight - topY) > 2) return false;
  }

  return true;
}

function tryPlaceTreeInChunk(data, lx, baseY, lz, worldX, worldZ, trunkBaseHeight) {
  if (lx < 2 || lx > CHUNK_SIZE_X - 3 || lz < 2 || lz > CHUNK_SIZE_Z - 3) return false;

  const trunkHeight = trunkBaseHeight + Math.floor(hash2(worldX * 0.77, worldZ * 0.77) * 3);
  if (baseY + trunkHeight + 2 >= WORLD_HEIGHT) return false;

  const ground = getLocalBlock(data, lx, baseY - 1, lz);
  if (ground !== BLOCK.GRASS && ground !== BLOCK.SNOW && ground !== BLOCK.MOSS) return false;

  for (let y = 0; y <= trunkHeight + 2; y += 1) {
    if (getLocalBlock(data, lx, baseY + y, lz) !== BLOCK.AIR) return false;
  }

  for (let y = 0; y < trunkHeight; y += 1) {
    setLocalBlock(data, lx, baseY + y, lz, BLOCK.WOOD);
  }

  const canopyY = baseY + trunkHeight;
  for (let oy = -2; oy <= 2; oy += 1) {
    const radius = oy >= 1 ? 1 : 2;
    for (let ox = -radius; ox <= radius; ox += 1) {
      for (let oz = -radius; oz <= radius; oz += 1) {
        if (Math.abs(ox) + Math.abs(oz) > radius + 1) continue;
        const leafX = lx + ox;
        const leafY = canopyY + oy;
        const leafZ = lz + oz;
        const existing = getLocalBlock(data, leafX, leafY, leafZ);
        if (existing === BLOCK.AIR || existing === BLOCK.LEAVES) {
          setLocalBlock(data, leafX, leafY, leafZ, BLOCK.LEAVES);
        }
      }
    }
  }

  setLocalBlock(data, lx, canopyY + 1, lz, BLOCK.LEAVES);
  return true;
}

function tryPlaceBirchInChunk(data, lx, baseY, lz, worldX, worldZ) {
  if (lx < 2 || lx > CHUNK_SIZE_X - 3 || lz < 2 || lz > CHUNK_SIZE_Z - 3) return false;

  const trunkHeight = 4 + Math.floor(hash2(worldX * 0.67, worldZ * 0.67) * 3);
  if (baseY + trunkHeight + 3 >= WORLD_HEIGHT) return false;

  const ground = getLocalBlock(data, lx, baseY - 1, lz);
  if (ground !== BLOCK.GRASS && ground !== BLOCK.DIRT && ground !== BLOCK.MOSS) return false;

  for (let y = 0; y <= trunkHeight + 2; y += 1) {
    if (getLocalBlock(data, lx, baseY + y, lz) !== BLOCK.AIR) return false;
  }

  for (let y = 0; y < trunkHeight; y += 1) {
    setLocalBlock(data, lx, baseY + y, lz, BLOCK.BIRCH_WOOD);
  }

  const canopyY = baseY + trunkHeight - 1;
  for (let oy = -1; oy <= 1; oy += 1) {
    const radius = oy === 0 ? 2 : 1;
    for (let ox = -radius; ox <= radius; ox += 1) {
      for (let oz = -radius; oz <= radius; oz += 1) {
        if (Math.abs(ox) + Math.abs(oz) > radius + 1) continue;
        const leafX = lx + ox;
        const leafY = canopyY + oy;
        const leafZ = lz + oz;
        const existing = getLocalBlock(data, leafX, leafY, leafZ);
        if (existing === BLOCK.AIR || existing === BLOCK.BIRCH_LEAVES) {
          setLocalBlock(data, leafX, leafY, leafZ, BLOCK.BIRCH_LEAVES);
        }
      }
    }
  }

  setLocalBlock(data, lx, canopyY + 2, lz, BLOCK.BIRCH_LEAVES);
  return true;
}

function tryPlaceBroadleafTreeInChunk(data, lx, baseY, lz, worldX, worldZ) {
  if (lx < 3 || lx > CHUNK_SIZE_X - 4 || lz < 3 || lz > CHUNK_SIZE_Z - 4) return false;

  const trunkHeight = 5 + Math.floor(hash2(worldX * 0.43, worldZ * 0.43) * 3);
  if (baseY + trunkHeight + 3 >= WORLD_HEIGHT) return false;

  const ground = getLocalBlock(data, lx, baseY - 1, lz);
  if (ground !== BLOCK.GRASS && ground !== BLOCK.DIRT && ground !== BLOCK.MOSS) return false;

  for (let y = 0; y <= trunkHeight + 2; y += 1) {
    if (getLocalBlock(data, lx, baseY + y, lz) !== BLOCK.AIR) return false;
  }

  for (let y = 0; y < trunkHeight; y += 1) {
    setLocalBlock(data, lx, baseY + y, lz, BLOCK.WOOD);
  }

  const canopyCenterY = baseY + trunkHeight - 1;
  for (let oy = -2; oy <= 2; oy += 1) {
    const radius = oy === 0 ? 3 : Math.abs(oy) === 1 ? 2 : 1;
    for (let ox = -radius; ox <= radius; ox += 1) {
      for (let oz = -radius; oz <= radius; oz += 1) {
        if (Math.abs(ox) + Math.abs(oz) > radius + 1) continue;
        const leafX = lx + ox;
        const leafY = canopyCenterY + oy;
        const leafZ = lz + oz;
        const existing = getLocalBlock(data, leafX, leafY, leafZ);
        if (existing === BLOCK.AIR || existing === BLOCK.LEAVES) {
          setLocalBlock(data, leafX, leafY, leafZ, BLOCK.LEAVES);
        }
      }
    }
  }

  return true;
}

function tryPlacePineInChunk(data, lx, baseY, lz, worldX, worldZ) {
  if (lx < 3 || lx > CHUNK_SIZE_X - 4 || lz < 3 || lz > CHUNK_SIZE_Z - 4) return false;

  const trunkHeight = 5 + Math.floor(hash2(worldX * 0.53, worldZ * 0.53) * 4);
  if (baseY + trunkHeight + 4 >= WORLD_HEIGHT) return false;

  const ground = getLocalBlock(data, lx, baseY - 1, lz);
  if (ground !== BLOCK.SNOW && ground !== BLOCK.GRASS && ground !== BLOCK.DIRT) return false;

  for (let y = 0; y <= trunkHeight + 3; y += 1) {
    if (getLocalBlock(data, lx, baseY + y, lz) !== BLOCK.AIR) return false;
  }

  for (let y = 0; y < trunkHeight; y += 1) {
    setLocalBlock(data, lx, baseY + y, lz, BLOCK.WOOD);
  }

  const canopyStart = baseY + trunkHeight - 3;
  for (let layer = 0; layer < 5; layer += 1) {
    const y = canopyStart + layer;
    const radius = layer <= 1 ? 2 : layer === 2 ? 1 : 0;
    for (let ox = -radius; ox <= radius; ox += 1) {
      for (let oz = -radius; oz <= radius; oz += 1) {
        if (Math.abs(ox) + Math.abs(oz) > radius + 1) continue;
        const existing = getLocalBlock(data, lx + ox, y, lz + oz);
        if (existing === BLOCK.AIR || existing === BLOCK.LEAVES) {
          setLocalBlock(data, lx + ox, y, lz + oz, BLOCK.LEAVES);
        }
      }
    }
  }

  setLocalBlock(data, lx, baseY + trunkHeight + 2, lz, BLOCK.LEAVES);
  return true;
}

function tryPlaceFirInChunk(data, lx, baseY, lz, worldX, worldZ) {
  if (lx < 3 || lx > CHUNK_SIZE_X - 4 || lz < 3 || lz > CHUNK_SIZE_Z - 4) return false;

  const trunkHeight = 4 + Math.floor(hash2(worldX * 0.39, worldZ * 0.39) * 3);
  if (baseY + trunkHeight + 4 >= WORLD_HEIGHT) return false;

  const ground = getLocalBlock(data, lx, baseY - 1, lz);
  if (ground !== BLOCK.SNOW && ground !== BLOCK.GRASS && ground !== BLOCK.DIRT) return false;

  for (let y = 0; y <= trunkHeight + 3; y += 1) {
    if (getLocalBlock(data, lx, baseY + y, lz) !== BLOCK.AIR) return false;
  }

  for (let y = 0; y < trunkHeight; y += 1) {
    setLocalBlock(data, lx, baseY + y, lz, BLOCK.WOOD);
  }

  const canopyBase = baseY + trunkHeight - 2;
  for (let layer = 0; layer < 4; layer += 1) {
    const y = canopyBase + layer;
    const radius = layer <= 1 ? 2 : 1;
    for (let ox = -radius; ox <= radius; ox += 1) {
      for (let oz = -radius; oz <= radius; oz += 1) {
        if (Math.abs(ox) + Math.abs(oz) > radius + 1) continue;
        const existing = getLocalBlock(data, lx + ox, y, lz + oz);
        if (existing === BLOCK.AIR || existing === BLOCK.LEAVES) {
          setLocalBlock(data, lx + ox, y, lz + oz, BLOCK.LEAVES);
        }
      }
    }
  }

  setLocalBlock(data, lx, canopyBase + 4, lz, BLOCK.LEAVES);
  return true;
}

function tryPlaceJungleTreeInChunk(data, lx, baseY, lz, worldX, worldZ) {
  if (lx < 3 || lx > CHUNK_SIZE_X - 4 || lz < 3 || lz > CHUNK_SIZE_Z - 4) return false;

  const trunkHeight = 7 + Math.floor(hash2(worldX * 0.41, worldZ * 0.41) * 4);
  if (baseY + trunkHeight + 5 >= WORLD_HEIGHT) return false;

  const ground = getLocalBlock(data, lx, baseY - 1, lz);
  if (ground !== BLOCK.MOSS && ground !== BLOCK.GRASS && ground !== BLOCK.DIRT) return false;

  for (let y = 0; y <= trunkHeight + 4; y += 1) {
    if (getLocalBlock(data, lx, baseY + y, lz) !== BLOCK.AIR) return false;
  }

  for (let y = 0; y < trunkHeight; y += 1) {
    setLocalBlock(data, lx, baseY + y, lz, BLOCK.JUNGLE_WOOD);
  }

  const canopyCenterY = baseY + trunkHeight - 1;
  for (let oy = -2; oy <= 3; oy += 1) {
    const radius = oy <= 0 ? 3 : oy === 1 ? 2 : 1;
    for (let ox = -radius; ox <= radius; ox += 1) {
      for (let oz = -radius; oz <= radius; oz += 1) {
        if (Math.abs(ox) + Math.abs(oz) > radius + 1) continue;
        const leafX = lx + ox;
        const leafY = canopyCenterY + oy;
        const leafZ = lz + oz;
        const existing = getLocalBlock(data, leafX, leafY, leafZ);
        if (existing === BLOCK.AIR || existing === BLOCK.JUNGLE_LEAVES) {
          setLocalBlock(data, leafX, leafY, leafZ, BLOCK.JUNGLE_LEAVES);
        }
      }
    }
  }

  setLocalBlock(data, lx, canopyCenterY + 3, lz, BLOCK.JUNGLE_LEAVES);

  for (const [dx, dz] of NEIGHBOR_OFFSETS_2D) {
    const vineChance = hash2(worldX * 0.37 + dx * 11, worldZ * 0.37 + dz * 7);
    if (vineChance <= 0.56) continue;

    const vineLength = 1 + Math.floor(vineChance * 3);
    const vineX = lx + dx * 2;
    const vineZ = lz + dz * 2;
    for (let v = 0; v < vineLength; v += 1) {
      const vineY = canopyCenterY - 1 - v;
      if (getLocalBlock(data, vineX, vineY, vineZ) !== BLOCK.AIR) break;
      setLocalBlock(data, vineX, vineY, vineZ, BLOCK.JUNGLE_LEAVES);
    }
  }

  return true;
}

function tryPlaceAcaciaInChunk(data, lx, baseY, lz, worldX, worldZ) {
  if (lx < 3 || lx > CHUNK_SIZE_X - 4 || lz < 3 || lz > CHUNK_SIZE_Z - 4) return false;

  const trunkHeight = 4 + Math.floor(hash2(worldX * 0.57, worldZ * 0.57) * 3);
  if (baseY + trunkHeight + 4 >= WORLD_HEIGHT) return false;

  const ground = getLocalBlock(data, lx, baseY - 1, lz);
  if (
    ground !== BLOCK.GRASS &&
    ground !== BLOCK.DIRT &&
    ground !== BLOCK.SAND &&
    ground !== BLOCK.RED_SAND &&
    ground !== BLOCK.MOSS
  ) {
    return false;
  }

  for (let y = 0; y <= trunkHeight + 3; y += 1) {
    if (getLocalBlock(data, lx, baseY + y, lz) !== BLOCK.AIR) return false;
  }

  for (let y = 0; y < trunkHeight; y += 1) {
    setLocalBlock(data, lx, baseY + y, lz, BLOCK.ACACIA_WOOD);
  }

  const dir = Math.floor(hash2(worldX * 0.73 - 19, worldZ * 0.73 + 27) * 4);
  const [dx, dz] = NEIGHBOR_OFFSETS_2D[dir];
  const bendBaseY = baseY + trunkHeight - 1;
  const apexX = lx + dx * 2;
  const apexZ = lz + dz * 2;

  for (let s = 1; s <= 2; s += 1) {
    const branchX = lx + dx * s;
    const branchY = bendBaseY + s - 1;
    const branchZ = lz + dz * s;
    const existing = getLocalBlock(data, branchX, branchY, branchZ);
    if (existing !== BLOCK.AIR && existing !== BLOCK.ACACIA_WOOD) return false;
    setLocalBlock(data, branchX, branchY, branchZ, BLOCK.ACACIA_WOOD);
  }

  const canopyY = bendBaseY + 1;
  for (let ox = -2; ox <= 2; ox += 1) {
    for (let oz = -2; oz <= 2; oz += 1) {
      if (Math.abs(ox) + Math.abs(oz) > 3) continue;
      const existing = getLocalBlock(data, apexX + ox, canopyY, apexZ + oz);
      if (existing === BLOCK.AIR || existing === BLOCK.ACACIA_LEAVES) {
        setLocalBlock(data, apexX + ox, canopyY, apexZ + oz, BLOCK.ACACIA_LEAVES);
      }
    }
  }

  for (let ox = -1; ox <= 1; ox += 1) {
    for (let oz = -1; oz <= 1; oz += 1) {
      if (Math.abs(ox) + Math.abs(oz) > 1) continue;
      const existing = getLocalBlock(data, apexX + ox, canopyY + 1, apexZ + oz);
      if (existing === BLOCK.AIR || existing === BLOCK.ACACIA_LEAVES) {
        setLocalBlock(data, apexX + ox, canopyY + 1, apexZ + oz, BLOCK.ACACIA_LEAVES);
      }
    }
  }

  setLocalBlock(data, apexX, canopyY + 2, apexZ, BLOCK.ACACIA_LEAVES);
  return true;
}

function tryPlaceCherryTreeInChunk(data, lx, baseY, lz, worldX, worldZ) {
  if (lx < 3 || lx > CHUNK_SIZE_X - 4 || lz < 3 || lz > CHUNK_SIZE_Z - 4) return false;

  const trunkHeight = 4 + Math.floor(hash2(worldX * 0.49, worldZ * 0.49) * 3);
  if (baseY + trunkHeight + 4 >= WORLD_HEIGHT) return false;

  const ground = getLocalBlock(data, lx, baseY - 1, lz);
  if (ground !== BLOCK.GRASS && ground !== BLOCK.DIRT && ground !== BLOCK.MOSS) return false;

  for (let y = 0; y <= trunkHeight + 3; y += 1) {
    if (getLocalBlock(data, lx, baseY + y, lz) !== BLOCK.AIR) return false;
  }

  for (let y = 0; y < trunkHeight; y += 1) {
    setLocalBlock(data, lx, baseY + y, lz, BLOCK.CHERRY_WOOD);
  }

  const canopyCenterY = baseY + trunkHeight;
  for (let oy = -2; oy <= 2; oy += 1) {
    const radius = oy === 0 ? 3 : Math.abs(oy) === 1 ? 2 : 1;
    for (let ox = -radius; ox <= radius; ox += 1) {
      for (let oz = -radius; oz <= radius; oz += 1) {
        if (Math.abs(ox) + Math.abs(oz) > radius + 1) continue;
        const leafX = lx + ox;
        const leafY = canopyCenterY + oy;
        const leafZ = lz + oz;
        const existing = getLocalBlock(data, leafX, leafY, leafZ);
        if (existing === BLOCK.AIR || existing === BLOCK.CHERRY_LEAVES) {
          setLocalBlock(data, leafX, leafY, leafZ, BLOCK.CHERRY_LEAVES);
        }
      }
    }
  }

  setLocalBlock(data, lx, canopyCenterY + 2, lz, BLOCK.CHERRY_LEAVES);

  for (const [dx, dz] of NEIGHBOR_OFFSETS_2D) {
    const dropChance = hash2(worldX * 0.29 + dx * 13, worldZ * 0.29 + dz * 17);
    if (dropChance <= 0.7) continue;
    const dropY = canopyCenterY - 2;
    const dropX = lx + dx * 2;
    const dropZ = lz + dz * 2;
    if (getLocalBlock(data, dropX, dropY, dropZ) === BLOCK.AIR) {
      setLocalBlock(data, dropX, dropY, dropZ, BLOCK.CHERRY_LEAVES);
    }
  }

  return true;
}

function tryPlaceWideOakInChunk(data, lx, baseY, lz, worldX, worldZ) {
  if (lx < 4 || lx > CHUNK_SIZE_X - 5 || lz < 4 || lz > CHUNK_SIZE_Z - 5) return false;

  const trunkHeight = 5 + Math.floor(hash2(worldX * 0.31 + 19, worldZ * 0.31 - 27) * 3);
  if (baseY + trunkHeight + 4 >= WORLD_HEIGHT) return false;

  const ground = getLocalBlock(data, lx, baseY - 1, lz);
  if (ground !== BLOCK.GRASS && ground !== BLOCK.DIRT && ground !== BLOCK.MOSS) return false;

  for (let y = 0; y <= trunkHeight + 3; y += 1) {
    if (getLocalBlock(data, lx, baseY + y, lz) !== BLOCK.AIR) return false;
  }

  for (let y = 0; y < trunkHeight; y += 1) {
    setLocalBlock(data, lx, baseY + y, lz, BLOCK.WOOD);
  }

  const canopyY = baseY + trunkHeight;
  for (let oy = -2; oy <= 2; oy += 1) {
    const radius = oy === 0 ? 3 : Math.abs(oy) === 1 ? 2 : 1;
    for (let ox = -radius; ox <= radius; ox += 1) {
      for (let oz = -radius; oz <= radius; oz += 1) {
        if (Math.abs(ox) + Math.abs(oz) > radius + 1) continue;
        const shellNoise = hash2((worldX + ox) * 0.79 + oy * 3, (worldZ + oz) * 0.79 - oy * 5);
        if (radius === 3 && shellNoise < 0.16) continue;
        const existing = getLocalBlock(data, lx + ox, canopyY + oy, lz + oz);
        if (existing === BLOCK.AIR || existing === BLOCK.LEAVES) {
          setLocalBlock(data, lx + ox, canopyY + oy, lz + oz, BLOCK.LEAVES);
        }
      }
    }
  }

  for (const [dx, dz] of NEIGHBOR_OFFSETS_2D) {
    const lobeY = canopyY + (hash2(worldX * 0.43 + dx * 7, worldZ * 0.43 + dz * 9) > 0.5 ? 0 : 1);
    const centerX = lx + dx * 2;
    const centerZ = lz + dz * 2;
    for (let ox = -1; ox <= 1; ox += 1) {
      for (let oz = -1; oz <= 1; oz += 1) {
        if (Math.abs(ox) + Math.abs(oz) > 2) continue;
        const existing = getLocalBlock(data, centerX + ox, lobeY, centerZ + oz);
        if (existing === BLOCK.AIR || existing === BLOCK.LEAVES) {
          setLocalBlock(data, centerX + ox, lobeY, centerZ + oz, BLOCK.LEAVES);
        }
      }
    }
  }

  setLocalBlock(data, lx, canopyY + 2, lz, BLOCK.LEAVES);
  return true;
}

function tryPlaceForkedOakInChunk(data, lx, baseY, lz, worldX, worldZ) {
  if (lx < 3 || lx > CHUNK_SIZE_X - 4 || lz < 3 || lz > CHUNK_SIZE_Z - 4) return false;

  const trunkHeight = 4 + Math.floor(hash2(worldX * 0.59 + 41, worldZ * 0.59 - 22) * 3);
  if (baseY + trunkHeight + 4 >= WORLD_HEIGHT) return false;

  const ground = getLocalBlock(data, lx, baseY - 1, lz);
  if (ground !== BLOCK.GRASS && ground !== BLOCK.DIRT && ground !== BLOCK.MOSS) return false;

  for (let y = 0; y <= trunkHeight + 3; y += 1) {
    if (getLocalBlock(data, lx, baseY + y, lz) !== BLOCK.AIR) return false;
  }

  const forkBaseY = baseY + trunkHeight - 2;
  const dirA = Math.floor(hash2(worldX * 0.73 - 13, worldZ * 0.73 + 9) * 4);
  const dirB = (dirA + 1 + Math.floor(hash2(worldX * 0.29 - 17, worldZ * 0.29 + 5) * 3)) % 4;
  const branchDirs = [NEIGHBOR_OFFSETS_2D[dirA], NEIGHBOR_OFFSETS_2D[dirB]];
  const branchEnds = [];

  for (let i = 0; i < branchDirs.length; i += 1) {
    const [dx, dz] = branchDirs[i];
    const branchLength = 2 + Math.floor(hash2(worldX * (0.41 + i * 0.07), worldZ * (0.41 + i * 0.07)) * 2);
    let endX = lx;
    let endY = forkBaseY;
    let endZ = lz;

    for (let s = 1; s <= branchLength; s += 1) {
      endX = lx + dx * s;
      endY = forkBaseY + Math.floor(s * 0.7);
      endZ = lz + dz * s;
      const existing = getLocalBlock(data, endX, endY, endZ);
      if (existing !== BLOCK.AIR && existing !== BLOCK.LEAVES && existing !== BLOCK.WOOD) return false;
    }

    branchEnds.push([endX, endY, endZ]);
  }

  for (let y = 0; y < trunkHeight - 1; y += 1) {
    setLocalBlock(data, lx, baseY + y, lz, BLOCK.WOOD);
  }
  setLocalBlock(data, lx, forkBaseY, lz, BLOCK.WOOD);

  for (let i = 0; i < branchDirs.length; i += 1) {
    const [dx, dz] = branchDirs[i];
    const [endX, endY, endZ] = branchEnds[i];
    const branchLength = Math.max(Math.abs(endX - lx), Math.abs(endZ - lz));
    for (let s = 1; s <= branchLength; s += 1) {
      const bx = lx + dx * s;
      const by = forkBaseY + Math.floor(s * 0.7);
      const bz = lz + dz * s;
      setLocalBlock(data, bx, by, bz, BLOCK.WOOD);
    }

    for (let oy = -1; oy <= 1; oy += 1) {
      const radius = oy === 0 ? 2 : 1;
      for (let ox = -radius; ox <= radius; ox += 1) {
        for (let oz = -radius; oz <= radius; oz += 1) {
          if (Math.abs(ox) + Math.abs(oz) > radius + 1) continue;
          const existing = getLocalBlock(data, endX + ox, endY + oy, endZ + oz);
          if (existing === BLOCK.AIR || existing === BLOCK.LEAVES) {
            setLocalBlock(data, endX + ox, endY + oy, endZ + oz, BLOCK.LEAVES);
          }
        }
      }
    }
  }

  setLocalBlock(data, lx, forkBaseY + 1, lz, BLOCK.LEAVES);
  setLocalBlock(data, lx, forkBaseY + 2, lz, BLOCK.LEAVES);
  return true;
}

function tryPlaceWillowInChunk(data, lx, baseY, lz, worldX, worldZ) {
  if (lx < 4 || lx > CHUNK_SIZE_X - 5 || lz < 4 || lz > CHUNK_SIZE_Z - 5) return false;

  const trunkHeight = 5 + Math.floor(hash2(worldX * 0.21 + 31, worldZ * 0.21 - 17) * 3);
  if (baseY + trunkHeight + 5 >= WORLD_HEIGHT) return false;

  const ground = getLocalBlock(data, lx, baseY - 1, lz);
  if (ground !== BLOCK.MOSS && ground !== BLOCK.GRASS && ground !== BLOCK.DIRT) return false;

  for (let y = 0; y <= trunkHeight + 4; y += 1) {
    if (getLocalBlock(data, lx, baseY + y, lz) !== BLOCK.AIR) return false;
  }

  for (let y = 0; y < trunkHeight; y += 1) {
    setLocalBlock(data, lx, baseY + y, lz, BLOCK.WOOD);
  }

  const canopyY = baseY + trunkHeight;
  for (let oy = -1; oy <= 2; oy += 1) {
    const radius = oy <= 0 ? 3 : oy === 1 ? 2 : 1;
    for (let ox = -radius; ox <= radius; ox += 1) {
      for (let oz = -radius; oz <= radius; oz += 1) {
        if (Math.abs(ox) + Math.abs(oz) > radius + 1) continue;
        const existing = getLocalBlock(data, lx + ox, canopyY + oy, lz + oz);
        if (existing === BLOCK.AIR || existing === BLOCK.BIRCH_LEAVES) {
          setLocalBlock(data, lx + ox, canopyY + oy, lz + oz, BLOCK.BIRCH_LEAVES);
        }
      }
    }
  }

  for (let ox = -3; ox <= 3; ox += 1) {
    for (let oz = -3; oz <= 3; oz += 1) {
      const edgeDistance = Math.abs(ox) + Math.abs(oz);
      if (edgeDistance < 4 || edgeDistance > 5) continue;
      const droopChance = hash2((worldX + ox) * 0.83 + 3, (worldZ + oz) * 0.83 - 6);
      if (droopChance < 0.56) continue;

      const length = 1 + Math.floor(droopChance * 4);
      const startX = lx + ox;
      const startZ = lz + oz;
      for (let d = 1; d <= length; d += 1) {
        const y = canopyY - d;
        if (y <= baseY) break;
        const existing = getLocalBlock(data, startX, y, startZ);
        if (existing !== BLOCK.AIR && existing !== BLOCK.BIRCH_LEAVES) break;
        setLocalBlock(data, startX, y, startZ, BLOCK.BIRCH_LEAVES);
      }
    }
  }

  return true;
}

function tryPlaceTallPineInChunk(data, lx, baseY, lz, worldX, worldZ) {
  if (lx < 3 || lx > CHUNK_SIZE_X - 4 || lz < 3 || lz > CHUNK_SIZE_Z - 4) return false;

  const trunkHeight = 8 + Math.floor(hash2(worldX * 0.27 + 59, worldZ * 0.27 - 31) * 4);
  if (baseY + trunkHeight + 4 >= WORLD_HEIGHT) return false;

  const ground = getLocalBlock(data, lx, baseY - 1, lz);
  if (ground !== BLOCK.SNOW && ground !== BLOCK.GRASS && ground !== BLOCK.DIRT && ground !== BLOCK.MOSS) {
    return false;
  }

  for (let y = 0; y <= trunkHeight + 3; y += 1) {
    if (getLocalBlock(data, lx, baseY + y, lz) !== BLOCK.AIR) return false;
  }

  for (let y = 0; y < trunkHeight; y += 1) {
    setLocalBlock(data, lx, baseY + y, lz, BLOCK.WOOD);
  }

  const canopyStart = baseY + trunkHeight - 7;
  for (let layer = 0; layer < 8; layer += 1) {
    const y = canopyStart + layer;
    const radius = layer <= 1 ? 3 : layer <= 3 ? 2 : layer <= 5 ? 1 : 0;
    for (let ox = -radius; ox <= radius; ox += 1) {
      for (let oz = -radius; oz <= radius; oz += 1) {
        if (Math.abs(ox) + Math.abs(oz) > radius + 1) continue;
        const shellChance = hash2(worldX * 0.19 + ox * 3 + layer, worldZ * 0.19 + oz * 5 - layer);
        if (radius === 3 && shellChance < 0.2) continue;
        const existing = getLocalBlock(data, lx + ox, y, lz + oz);
        if (existing === BLOCK.AIR || existing === BLOCK.LEAVES) {
          setLocalBlock(data, lx + ox, y, lz + oz, BLOCK.LEAVES);
        }
      }
    }
  }

  setLocalBlock(data, lx, baseY + trunkHeight + 1, lz, BLOCK.LEAVES);
  return true;
}

function tryPlaceMegaJungleInChunk(data, lx, baseY, lz, worldX, worldZ) {
  if (lx < 4 || lx > CHUNK_SIZE_X - 6 || lz < 4 || lz > CHUNK_SIZE_Z - 6) return false;

  const trunkHeight = 8 + Math.floor(hash2(worldX * 0.17 + 71, worldZ * 0.17 - 43) * 5);
  if (baseY + trunkHeight + 6 >= WORLD_HEIGHT) return false;

  for (let tx = 0; tx <= 1; tx += 1) {
    for (let tz = 0; tz <= 1; tz += 1) {
      const ground = getLocalBlock(data, lx + tx, baseY - 1, lz + tz);
      if (ground !== BLOCK.MOSS && ground !== BLOCK.GRASS && ground !== BLOCK.DIRT) return false;

      for (let y = 0; y <= trunkHeight + 5; y += 1) {
        if (getLocalBlock(data, lx + tx, baseY + y, lz + tz) !== BLOCK.AIR) return false;
      }
    }
  }

  for (let y = 0; y < trunkHeight; y += 1) {
    setLocalBlock(data, lx, baseY + y, lz, BLOCK.JUNGLE_WOOD);
    setLocalBlock(data, lx + 1, baseY + y, lz, BLOCK.JUNGLE_WOOD);
    setLocalBlock(data, lx, baseY + y, lz + 1, BLOCK.JUNGLE_WOOD);
    setLocalBlock(data, lx + 1, baseY + y, lz + 1, BLOCK.JUNGLE_WOOD);
  }

  const canopyY = baseY + trunkHeight;
  for (let oy = -2; oy <= 3; oy += 1) {
    const radius = oy <= 0 ? 4 : oy === 1 ? 3 : oy === 2 ? 2 : 1;
    for (let ox = -radius; ox <= radius; ox += 1) {
      for (let oz = -radius; oz <= radius; oz += 1) {
        if (Math.abs(ox) + Math.abs(oz) > radius + 2) continue;
        const existing = getLocalBlock(data, lx + ox, canopyY + oy, lz + oz);
        if (existing === BLOCK.AIR || existing === BLOCK.JUNGLE_LEAVES) {
          setLocalBlock(data, lx + ox, canopyY + oy, lz + oz, BLOCK.JUNGLE_LEAVES);
        }
      }
    }
  }

  for (let ox = -4; ox <= 4; ox += 1) {
    for (let oz = -4; oz <= 4; oz += 1) {
      const edgeDistance = Math.abs(ox) + Math.abs(oz);
      if (edgeDistance < 5 || edgeDistance > 6) continue;
      const vineChance = hash2((worldX + ox) * 0.24 + 11, (worldZ + oz) * 0.24 - 7);
      if (vineChance < 0.72) continue;
      const vineLength = 1 + Math.floor(vineChance * 3);
      for (let d = 1; d <= vineLength; d += 1) {
        const y = canopyY - d;
        const x = lx + ox;
        const z = lz + oz;
        if (getLocalBlock(data, x, y, z) !== BLOCK.AIR) break;
        setLocalBlock(data, x, y, z, BLOCK.JUNGLE_LEAVES);
      }
    }
  }

  return true;
}

function tryPlaceAcaciaTwinInChunk(data, lx, baseY, lz, worldX, worldZ) {
  if (lx < 4 || lx > CHUNK_SIZE_X - 5 || lz < 4 || lz > CHUNK_SIZE_Z - 5) return false;

  const trunkHeight = 4 + Math.floor(hash2(worldX * 0.35 + 23, worldZ * 0.35 - 13) * 3);
  if (baseY + trunkHeight + 4 >= WORLD_HEIGHT) return false;

  const ground = getLocalBlock(data, lx, baseY - 1, lz);
  if (
    ground !== BLOCK.GRASS &&
    ground !== BLOCK.DIRT &&
    ground !== BLOCK.SAND &&
    ground !== BLOCK.RED_SAND &&
    ground !== BLOCK.MOSS
  ) {
    return false;
  }

  for (let y = 0; y <= trunkHeight + 3; y += 1) {
    if (getLocalBlock(data, lx, baseY + y, lz) !== BLOCK.AIR) return false;
  }

  for (let y = 0; y < trunkHeight; y += 1) {
    setLocalBlock(data, lx, baseY + y, lz, BLOCK.ACACIA_WOOD);
  }

  const dirA = Math.floor(hash2(worldX * 0.52 + 7, worldZ * 0.52 - 9) * 4);
  const dirB = (dirA + 2) % 4;
  const branchDirs = [NEIGHBOR_OFFSETS_2D[dirA], NEIGHBOR_OFFSETS_2D[dirB]];
  const branchBaseY = baseY + trunkHeight - 1;

  for (let i = 0; i < branchDirs.length; i += 1) {
    const [dx, dz] = branchDirs[i];
    const length = 2 + Math.floor(hash2(worldX * (0.29 + i * 0.11), worldZ * (0.29 + i * 0.11)) * 2);
    let endX = lx;
    let endY = branchBaseY;
    let endZ = lz;

    for (let s = 1; s <= length; s += 1) {
      endX = lx + dx * s;
      endY = branchBaseY + Math.floor(s * 0.45);
      endZ = lz + dz * s;
      const existing = getLocalBlock(data, endX, endY, endZ);
      if (existing !== BLOCK.AIR && existing !== BLOCK.ACACIA_WOOD) return false;
      setLocalBlock(data, endX, endY, endZ, BLOCK.ACACIA_WOOD);
    }

    for (let ox = -2; ox <= 2; ox += 1) {
      for (let oz = -2; oz <= 2; oz += 1) {
        if (Math.abs(ox) + Math.abs(oz) > 3) continue;
        const existing = getLocalBlock(data, endX + ox, endY, endZ + oz);
        if (existing === BLOCK.AIR || existing === BLOCK.ACACIA_LEAVES) {
          setLocalBlock(data, endX + ox, endY, endZ + oz, BLOCK.ACACIA_LEAVES);
        }
      }
    }
    setLocalBlock(data, endX, endY + 1, endZ, BLOCK.ACACIA_LEAVES);
  }

  return true;
}

function tryPlaceWeepingCherryInChunk(data, lx, baseY, lz, worldX, worldZ) {
  if (lx < 4 || lx > CHUNK_SIZE_X - 5 || lz < 4 || lz > CHUNK_SIZE_Z - 5) return false;

  const trunkHeight = 5 + Math.floor(hash2(worldX * 0.33 + 37, worldZ * 0.33 - 21) * 3);
  if (baseY + trunkHeight + 5 >= WORLD_HEIGHT) return false;

  const ground = getLocalBlock(data, lx, baseY - 1, lz);
  if (ground !== BLOCK.GRASS && ground !== BLOCK.DIRT && ground !== BLOCK.MOSS) return false;

  for (let y = 0; y <= trunkHeight + 4; y += 1) {
    if (getLocalBlock(data, lx, baseY + y, lz) !== BLOCK.AIR) return false;
  }

  for (let y = 0; y < trunkHeight; y += 1) {
    setLocalBlock(data, lx, baseY + y, lz, BLOCK.CHERRY_WOOD);
  }

  const canopyY = baseY + trunkHeight;
  for (let oy = -1; oy <= 2; oy += 1) {
    const radius = oy <= 0 ? 3 : oy === 1 ? 2 : 1;
    for (let ox = -radius; ox <= radius; ox += 1) {
      for (let oz = -radius; oz <= radius; oz += 1) {
        if (Math.abs(ox) + Math.abs(oz) > radius + 1) continue;
        const existing = getLocalBlock(data, lx + ox, canopyY + oy, lz + oz);
        if (existing === BLOCK.AIR || existing === BLOCK.CHERRY_LEAVES) {
          setLocalBlock(data, lx + ox, canopyY + oy, lz + oz, BLOCK.CHERRY_LEAVES);
        }
      }
    }
  }

  for (let ox = -3; ox <= 3; ox += 1) {
    for (let oz = -3; oz <= 3; oz += 1) {
      const edgeDistance = Math.abs(ox) + Math.abs(oz);
      if (edgeDistance < 4 || edgeDistance > 5) continue;
      const droopChance = hash2((worldX + ox) * 0.62 + 13, (worldZ + oz) * 0.62 - 4);
      if (droopChance < 0.5) continue;

      const length = 2 + Math.floor(droopChance * 3);
      const x = lx + ox;
      const z = lz + oz;
      for (let d = 1; d <= length; d += 1) {
        const y = canopyY - d;
        if (y <= baseY) break;
        const existing = getLocalBlock(data, x, y, z);
        if (existing !== BLOCK.AIR && existing !== BLOCK.CHERRY_LEAVES) break;
        setLocalBlock(data, x, y, z, BLOCK.CHERRY_LEAVES);
      }
    }
  }

  return true;
}

function tryPlaceRedwoodInChunk(data, lx, baseY, lz, worldX, worldZ) {
  if (lx < 4 || lx > CHUNK_SIZE_X - 6 || lz < 4 || lz > CHUNK_SIZE_Z - 6) return false;

  const trunkHeight = 10 + Math.floor(hash2(worldX * 0.23 + 17, worldZ * 0.23 - 29) * 5);
  if (baseY + trunkHeight + 6 >= WORLD_HEIGHT) return false;

  for (let tx = 0; tx <= 1; tx += 1) {
    for (let tz = 0; tz <= 1; tz += 1) {
      const ground = getLocalBlock(data, lx + tx, baseY - 1, lz + tz);
      if (ground !== BLOCK.GRASS && ground !== BLOCK.DIRT && ground !== BLOCK.MOSS) return false;

      for (let y = 0; y <= trunkHeight + 5; y += 1) {
        if (getLocalBlock(data, lx + tx, baseY + y, lz + tz) !== BLOCK.AIR) return false;
      }
    }
  }

  for (let y = 0; y < trunkHeight; y += 1) {
    setLocalBlock(data, lx, baseY + y, lz, BLOCK.JUNGLE_WOOD);
    setLocalBlock(data, lx + 1, baseY + y, lz, BLOCK.JUNGLE_WOOD);
    setLocalBlock(data, lx, baseY + y, lz + 1, BLOCK.JUNGLE_WOOD);
    setLocalBlock(data, lx + 1, baseY + y, lz + 1, BLOCK.JUNGLE_WOOD);
  }

  const canopyBaseY = baseY + trunkHeight - 2;
  for (let oy = -2; oy <= 4; oy += 1) {
    const radius = oy <= 0 ? 3 : oy <= 2 ? 2 : 1;
    for (let ox = -radius; ox <= radius; ox += 1) {
      for (let oz = -radius; oz <= radius; oz += 1) {
        if (Math.abs(ox) + Math.abs(oz) > radius + 1) continue;
        const shellNoise = hash2((worldX + ox) * 0.43 + oy * 5, (worldZ + oz) * 0.43 - oy * 7);
        if (radius >= 3 && shellNoise < 0.2) continue;
        const leafX = lx + ox;
        const leafY = canopyBaseY + oy;
        const leafZ = lz + oz;
        const existing = getLocalBlock(data, leafX, leafY, leafZ);
        if (existing === BLOCK.AIR || existing === BLOCK.JUNGLE_LEAVES) {
          setLocalBlock(data, leafX, leafY, leafZ, BLOCK.JUNGLE_LEAVES);
        }
      }
    }
  }

  for (const [dx, dz] of NEIGHBOR_OFFSETS_2D) {
    const branchChance = hash2(worldX * 0.61 + dx * 13, worldZ * 0.61 + dz * 17);
    if (branchChance < 0.58) continue;
    const branchY = canopyBaseY - 1 + Math.floor(branchChance * 3);
    const branchLength = 2 + Math.floor(branchChance * 2);
    let endX = lx;
    let endY = branchY;
    let endZ = lz;

    for (let s = 1; s <= branchLength; s += 1) {
      endX = lx + dx * s;
      endY = branchY + Math.floor(s * 0.35);
      endZ = lz + dz * s;
      const existing = getLocalBlock(data, endX, endY, endZ);
      if (existing !== BLOCK.AIR && existing !== BLOCK.JUNGLE_WOOD && existing !== BLOCK.JUNGLE_LEAVES) break;
      setLocalBlock(data, endX, endY, endZ, BLOCK.JUNGLE_WOOD);
    }

    for (let oy = -1; oy <= 1; oy += 1) {
      const radius = oy === 0 ? 2 : 1;
      for (let ox = -radius; ox <= radius; ox += 1) {
        for (let oz = -radius; oz <= radius; oz += 1) {
          if (Math.abs(ox) + Math.abs(oz) > radius + 1) continue;
          const leafX = endX + ox;
          const leafY = endY + oy;
          const leafZ = endZ + oz;
          const existing = getLocalBlock(data, leafX, leafY, leafZ);
          if (existing === BLOCK.AIR || existing === BLOCK.JUNGLE_LEAVES) {
            setLocalBlock(data, leafX, leafY, leafZ, BLOCK.JUNGLE_LEAVES);
          }
        }
      }
    }
  }

  setLocalBlock(data, lx, canopyBaseY + 3, lz, BLOCK.JUNGLE_LEAVES);
  setLocalBlock(data, lx + 1, canopyBaseY + 3, lz, BLOCK.JUNGLE_LEAVES);
  setLocalBlock(data, lx, canopyBaseY + 3, lz + 1, BLOCK.JUNGLE_LEAVES);
  setLocalBlock(data, lx + 1, canopyBaseY + 3, lz + 1, BLOCK.JUNGLE_LEAVES);

  return true;
}

function tryPlacePalmInChunk(data, lx, baseY, lz, worldX, worldZ) {
  if (lx < 3 || lx > CHUNK_SIZE_X - 4 || lz < 3 || lz > CHUNK_SIZE_Z - 4) return false;

  const trunkHeight = 5 + Math.floor(hash2(worldX * 0.48 + 23, worldZ * 0.48 - 41) * 3);
  const leanStrength = 1 + Math.floor(hash2(worldX * 0.36 - 9, worldZ * 0.36 + 14) * 2);
  if (baseY + trunkHeight + 3 >= WORLD_HEIGHT) return false;

  const ground = getLocalBlock(data, lx, baseY - 1, lz);
  if (
    ground !== BLOCK.SAND &&
    ground !== BLOCK.RED_SAND &&
    ground !== BLOCK.GRASS &&
    ground !== BLOCK.DIRT &&
    ground !== BLOCK.MOSS
  ) {
    return false;
  }

  const dir = Math.floor(hash2(worldX * 0.67 + 7, worldZ * 0.67 - 17) * 4);
  const [dx, dz] = NEIGHBOR_OFFSETS_2D[dir];
  const trunkPoints = [];

  for (let y = 0; y < trunkHeight; y += 1) {
    const shift = Math.min(leanStrength, Math.floor(Math.max(0, y - 2) * 0.5));
    const tx = lx + dx * shift;
    const tz = lz + dz * shift;
    const ty = baseY + y;
    if (getLocalBlock(data, tx, ty, tz) !== BLOCK.AIR) return false;
    trunkPoints.push([tx, ty, tz]);
  }

  for (const [tx, ty, tz] of trunkPoints) {
    setLocalBlock(data, tx, ty, tz, BLOCK.ACACIA_WOOD);
  }

  const top = trunkPoints[trunkPoints.length - 1];
  const topX = top[0];
  const topY = top[1];
  const topZ = top[2];

  setLocalBlock(data, topX, topY + 1, topZ, BLOCK.ACACIA_LEAVES);

  for (const [fdx, fdz] of NEIGHBOR_OFFSETS_2D) {
    const frondLength = 2 + Math.floor(hash2(worldX * 0.37 + fdx * 19, worldZ * 0.37 + fdz * 23) * 2);
    for (let s = 1; s <= frondLength; s += 1) {
      const fx = topX + fdx * s;
      const fz = topZ + fdz * s;
      const fy = topY + 1 - Math.floor((s - 1) * 0.5);
      const existing = getLocalBlock(data, fx, fy, fz);
      if (existing === BLOCK.AIR || existing === BLOCK.ACACIA_LEAVES || existing === BLOCK.LEAVES) {
        setLocalBlock(data, fx, fy, fz, BLOCK.ACACIA_LEAVES);
      }
      if (s >= 2) {
        const sideA = [fdz, -fdx];
        const sideB = [-fdz, fdx];
        if (getLocalBlock(data, fx + sideA[0], fy, fz + sideA[1]) === BLOCK.AIR) {
          setLocalBlock(data, fx + sideA[0], fy, fz + sideA[1], BLOCK.ACACIA_LEAVES);
        }
        if (getLocalBlock(data, fx + sideB[0], fy, fz + sideB[1]) === BLOCK.AIR) {
          setLocalBlock(data, fx + sideB[0], fy, fz + sideB[1], BLOCK.ACACIA_LEAVES);
        }
      }
    }
  }

  const diagonals = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  for (const [ddx, ddz] of diagonals) {
    const leafX = topX + ddx;
    const leafZ = topZ + ddz;
    if (getLocalBlock(data, leafX, topY + 1, leafZ) === BLOCK.AIR) {
      setLocalBlock(data, leafX, topY + 1, leafZ, BLOCK.ACACIA_LEAVES);
    }
  }

  return true;
}

function tryPlaceCactusInChunk(data, lx, baseY, lz, worldX, worldZ) {
  if (lx < 2 || lx > CHUNK_SIZE_X - 3 || lz < 2 || lz > CHUNK_SIZE_Z - 3) return false;

  const ground = getLocalBlock(data, lx, baseY - 1, lz);
  if (ground !== BLOCK.SAND && ground !== BLOCK.RED_SAND) return false;

  const height = 2 + Math.floor(hash2(worldX * 1.11, worldZ * 1.11) * 3);
  if (baseY + height + 1 >= WORLD_HEIGHT) return false;

  for (let y = 0; y < height; y += 1) {
    if (getLocalBlock(data, lx, baseY + y, lz) !== BLOCK.AIR) return false;
  }

  for (let y = 0; y < height; y += 1) {
    setLocalBlock(data, lx, baseY + y, lz, BLOCK.CACTUS);
  }

  if (height >= 3) {
    const armChance = hash2(worldX * 0.91 + 13, worldZ * 0.91 - 7);
    if (armChance > 0.76) {
      const armY = baseY + 1 + Math.floor(armChance * (height - 1));
      const dir = Math.floor(hash2(worldX * 0.27, worldZ * 0.27) * 4);
      const offset = NEIGHBOR_OFFSETS_2D[dir];
      const armX = lx + offset[0];
      const armZ = lz + offset[1];

      if (
        getLocalBlock(data, armX, armY, armZ) === BLOCK.AIR &&
        getLocalBlock(data, armX, armY + 1, armZ) === BLOCK.AIR
      ) {
        setLocalBlock(data, armX, armY, armZ, BLOCK.CACTUS);
        setLocalBlock(data, armX, armY + 1, armZ, BLOCK.CACTUS);
      }
    }
  }

  return true;
}

function isBushGroundType(type, allowArid = false) {
  return (
    type === BLOCK.GRASS ||
    type === BLOCK.DIRT ||
    type === BLOCK.SNOW ||
    type === BLOCK.MOSS ||
    (allowArid && (type === BLOCK.SAND || type === BLOCK.RED_SAND))
  );
}

function tryPlaceBushInChunk(data, lx, baseY, lz, leafBlock = BLOCK.BUSH, allowArid = false) {
  if (lx < 1 || lx > CHUNK_SIZE_X - 2 || lz < 1 || lz > CHUNK_SIZE_Z - 2) return false;
  if (baseY + 2 >= WORLD_HEIGHT) return false;

  const ground = getLocalBlock(data, lx, baseY - 1, lz);
  if (!isBushGroundType(ground, allowArid)) return false;
  if (getLocalBlock(data, lx, baseY, lz) !== BLOCK.AIR) return false;

  setLocalBlock(data, lx, baseY, lz, leafBlock);
  for (const [dx, dz] of NEIGHBOR_OFFSETS_2D) {
    if (getLocalBlock(data, lx + dx, baseY, lz + dz) === BLOCK.AIR) {
      setLocalBlock(data, lx + dx, baseY, lz + dz, leafBlock);
    }
  }
  if (getLocalBlock(data, lx, baseY + 1, lz) === BLOCK.AIR) {
    setLocalBlock(data, lx, baseY + 1, lz, leafBlock);
  }

  return true;
}

function tryPlaceLargeBushClusterInChunk(
  data,
  lx,
  baseY,
  lz,
  worldX,
  worldZ,
  bushType = BLOCK.SHRUB,
  allowArid = false
) {
  const radius = 2;
  if (
    lx < radius || lx > CHUNK_SIZE_X - 1 - radius ||
    lz < radius || lz > CHUNK_SIZE_Z - 1 - radius
  ) {
    return false;
  }
  if (baseY + 2 >= WORLD_HEIGHT) return false;

  const placements = [];
  for (let dz = -radius; dz <= radius; dz += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const edge = Math.abs(dx) + Math.abs(dz);
      if (edge > 3) continue;
      const chance = hash2((worldX + dx) * 0.71 + edge * 7, (worldZ + dz) * 0.71 - edge * 5);
      const threshold = edge <= 1 ? 0.12 : edge === 2 ? 0.34 : 0.52;
      if (chance < threshold) continue;

      const px = lx + dx;
      const pz = lz + dz;
      const ground = getLocalBlock(data, px, baseY - 1, pz);
      if (!isBushGroundType(ground, allowArid)) continue;
      if (getLocalBlock(data, px, baseY, pz) !== BLOCK.AIR) continue;
      placements.push([px, pz, dx, dz]);
    }
  }

  if (placements.length < 6) return false;

  for (const placement of placements) {
    setLocalBlock(data, placement[0], baseY, placement[1], bushType);
  }

  for (const placement of placements) {
    const px = placement[0];
    const pz = placement[1];
    const dx = placement[2];
    const dz = placement[3];
    const capChance = hash2((worldX + dx) * 1.03 + 11, (worldZ + dz) * 1.03 - 13);
    if (capChance > 0.66 && getLocalBlock(data, px, baseY + 1, pz) === BLOCK.AIR) {
      setLocalBlock(data, px, baseY + 1, pz, bushType);
    }
  }

  if (getLocalBlock(data, lx, baseY + 1, lz) === BLOCK.AIR) {
    setLocalBlock(data, lx, baseY + 1, lz, bushType);
  }

  return true;
}

function tryPlaceSingleFlora(data, lx, baseY, lz, type) {
  if (baseY >= WORLD_HEIGHT) return false;
  if (getLocalBlock(data, lx, baseY, lz) !== BLOCK.AIR) return false;
  setLocalBlock(data, lx, baseY, lz, type);
  return true;
}

function getOreTypeAt(worldX, y, worldZ) {
  if (y < 5 || y > 48) return BLOCK.AIR;

  const ironNoise = fbm3D((worldX - 130) * 0.18, y * 0.24, (worldZ + 210) * 0.18, 2);
  const coalNoise = fbm3D((worldX + 420) * 0.15, y * 0.2, (worldZ - 310) * 0.15, 2);

  if (y < 30 && ironNoise > 0.54) return BLOCK.IRON_ORE;
  if (y < 46 && coalNoise > 0.58) return BLOCK.COAL_ORE;
  return BLOCK.AIR;
}

function getClampedColumnHeight(columnHeights, lx, lz) {
  const clampedX = THREE.MathUtils.clamp(lx, 0, CHUNK_SIZE_X - 1);
  const clampedZ = THREE.MathUtils.clamp(lz, 0, CHUNK_SIZE_Z - 1);
  return columnHeights[chunkColumnIndex(clampedX, clampedZ)];
}

function getClampedColumnBiome(columnBiomes, lx, lz) {
  const clampedX = THREE.MathUtils.clamp(lx, 0, CHUNK_SIZE_X - 1);
  const clampedZ = THREE.MathUtils.clamp(lz, 0, CHUNK_SIZE_Z - 1);
  return columnBiomes[chunkColumnIndex(clampedX, clampedZ)];
}

function getClampedColumnRiver(columnRivers, lx, lz) {
  const clampedX = THREE.MathUtils.clamp(lx, 0, CHUNK_SIZE_X - 1);
  const clampedZ = THREE.MathUtils.clamp(lz, 0, CHUNK_SIZE_Z - 1);
  return columnRivers[chunkColumnIndex(clampedX, clampedZ)];
}

function applyCliffFacesToChunk(data, columnHeights, columnBiomes, cx, cz) {
  for (let lx = 0; lx < CHUNK_SIZE_X; lx += 1) {
    for (let lz = 0; lz < CHUNK_SIZE_Z; lz += 1) {
      const columnIdx = chunkColumnIndex(lx, lz);
      const topY = columnHeights[columnIdx];
      if (topY <= SEA_LEVEL + 2 || topY >= WORLD_HEIGHT - 2) continue;

      const leftHeight = getClampedColumnHeight(columnHeights, lx - 1, lz);
      const rightHeight = getClampedColumnHeight(columnHeights, lx + 1, lz);
      const backHeight = getClampedColumnHeight(columnHeights, lx, lz - 1);
      const frontHeight = getClampedColumnHeight(columnHeights, lx, lz + 1);
      const slopeX = (rightHeight - leftHeight) * 0.5;
      const slopeZ = (frontHeight - backHeight) * 0.5;
      const slope = Math.hypot(slopeX, slopeZ);
      const slopeFactor = THREE.MathUtils.clamp((slope - 1.35) / 5.4, 0, 1);
      if (slopeFactor <= 0) continue;

      const biome = columnBiomes[columnIdx];
      const worldX = cx * CHUNK_SIZE_X + lx;
      const worldZ = cz * CHUNK_SIZE_Z + lz;
      const weathering = fbm2D((worldX + 180) * 0.035, (worldZ - 420) * 0.035, 2) * 0.5 + 0.5;
      const elevation = THREE.MathUtils.clamp(
        (topY - SEA_LEVEL) / Math.max(1, WORLD_HEIGHT - SEA_LEVEL - 2),
        0,
        1
      );

      let biomeRockiness = 0.32;
      if (biome === BIOME.GLACIER) biomeRockiness = 1.0;
      if (biome === BIOME.ALPINE) biomeRockiness = 0.96;
      else if (biome === BIOME.VOLCANIC) biomeRockiness = 1.0;
      else if (biome === BIOME.MESA || biome === BIOME.BADLANDS) biomeRockiness = 0.86;
      else if (biome === BIOME.HEATH) biomeRockiness = 0.66;
      else if (biome === BIOME.STEPPE) biomeRockiness = 0.46;
      else if (biome === BIOME.TUNDRA) biomeRockiness = 0.72;
      else if (biome === BIOME.SAVANNA) biomeRockiness = 0.58;
      else if (biome === BIOME.DESERT) biomeRockiness = 0.52;
      else if (biome === BIOME.JUNGLE) biomeRockiness = 0.44;
      else if (biome === BIOME.MANGROVE) biomeRockiness = 0.12;
      else if (biome === BIOME.SWAMP) biomeRockiness = 0.14;
      else if (biome === BIOME.REDWOOD) biomeRockiness = 0.4;
      else if (biome === BIOME.OASIS) biomeRockiness = 0.22;
      else if (biome === BIOME.FOREST || biome === BIOME.CHERRY_GROVE) biomeRockiness = 0.36;

      let exposure = slopeFactor * (0.56 + elevation * 0.44) * biomeRockiness;
      exposure += Math.max(0, weathering - 0.72) * 0.26;
      if (biome === BIOME.SWAMP && topY <= SEA_LEVEL + 4) {
        exposure *= 0.12;
      }
      if (biome === BIOME.MANGROVE && topY <= SEA_LEVEL + 5) {
        exposure *= 0.08;
      }
      if (biome === BIOME.OASIS && topY <= SEA_LEVEL + 7) {
        exposure *= 0.3;
      }
      if (biome === BIOME.JUNGLE && topY <= SEA_LEVEL + 6) {
        exposure *= 0.5;
      }
      if (biome === BIOME.REDWOOD && topY <= SEA_LEVEL + 5) {
        exposure *= 0.72;
      }
      if (exposure < 0.28) continue;

      const isSnowCliff =
        (biome === BIOME.GLACIER && topY > SEA_LEVEL + 4) ||
        (biome === BIOME.ALPINE && topY > SEA_LEVEL + 8) ||
        (biome === BIOME.TUNDRA && topY > SEA_LEVEL + 5);
      let cliffTopBlock = BLOCK.STONE;
      let cliffCoreBlock = BLOCK.STONE;
      if (isSnowCliff) {
        cliffTopBlock = BLOCK.SNOW;
      } else if (biome === BIOME.VOLCANIC) {
        cliffTopBlock = BLOCK.BASALT;
        cliffCoreBlock = BLOCK.BASALT;
      } else if (biome === BIOME.MESA || biome === BIOME.BADLANDS) {
        cliffTopBlock = exposure > 0.68 ? BLOCK.BASALT : BLOCK.RED_SAND;
        cliffCoreBlock = BLOCK.BASALT;
      } else if (biome === BIOME.DESERT && exposure < 0.44) {
        cliffTopBlock = BLOCK.SAND;
      } else if (biome === BIOME.MANGROVE && exposure < 0.56) {
        cliffTopBlock = BLOCK.MOSS;
      } else if (biome === BIOME.OASIS && exposure < 0.5) {
        cliffTopBlock = BLOCK.SAND;
      } else if (biome === BIOME.REDWOOD && exposure < 0.46) {
        cliffTopBlock = BLOCK.MOSS;
      } else if (biome === BIOME.HEATH && exposure < 0.42) {
        cliffTopBlock = BLOCK.GRASS;
      } else if (biome === BIOME.STEPPE && exposure < 0.4) {
        cliffTopBlock = BLOCK.GRASS;
      } else if (biome === BIOME.GLACIER && exposure < 0.7) {
        cliffTopBlock = BLOCK.SNOW;
      }
      setLocalBlock(data, lx, topY, lz, cliffTopBlock);

      const rockDepth = 1 + Math.floor(exposure * 2.6);
      for (let depth = 1; depth <= rockDepth; depth += 1) {
        const y = topY - depth;
        if (y < 0) break;
        const belowType = getLocalBlock(data, lx, y, lz);
        if (belowType === BLOCK.AIR) break;
        if (belowType === BLOCK.SNOW && isSnowCliff) continue;
        setLocalBlock(data, lx, y, lz, cliffCoreBlock);
      }
    }
  }
}

function generateChunkData(cx, cz) {
  const data = new Uint8Array(CHUNK_SIZE_X * WORLD_HEIGHT * CHUNK_SIZE_Z);
  const columnHeights = new Uint8Array(CHUNK_SIZE_X * CHUNK_SIZE_Z);
  const columnBiomes = new Uint8Array(CHUNK_SIZE_X * CHUNK_SIZE_Z);
  const columnRivers = new Float32Array(CHUNK_SIZE_X * CHUNK_SIZE_Z);
  let treeCount = 0;
  let oreCount = 0;

  for (let lx = 0; lx < CHUNK_SIZE_X; lx += 1) {
    for (let lz = 0; lz < CHUNK_SIZE_Z; lz += 1) {
      const worldX = cx * CHUNK_SIZE_X + lx;
      const worldZ = cz * CHUNK_SIZE_Z + lz;
      const riverIntensity = getRiverIntensity(worldX, worldZ);
      const biomeBlend = getBiomeBlendAt(worldX, worldZ, riverIntensity, biomeBlendScratch);
      const biome = biomeBlend.dominantBiome;
      const terrainHeight = getTerrainHeight(worldX, worldZ, biome, riverIntensity, biomeBlend);
      const columnIdx = chunkColumnIndex(lx, lz);

      columnBiomes[columnIdx] = biome;
      columnHeights[columnIdx] = terrainHeight;
      columnRivers[columnIdx] = riverIntensity;
      const surfaceBlock = getSurfaceBlock(biome, terrainHeight, riverIntensity);
      const subSurfaceBlock = getSubSurfaceBlock(biome, terrainHeight, riverIntensity);

      for (let y = 0; y <= terrainHeight; y += 1) {
        let type = BLOCK.STONE;
        if (y === terrainHeight) {
          type = surfaceBlock;
        } else if (y >= terrainHeight - 3) {
          type = subSurfaceBlock;
        }
        setLocalBlock(data, lx, y, lz, type);
      }
    }
  }

  applyCliffFacesToChunk(data, columnHeights, columnBiomes, cx, cz);

  for (let lx = 0; lx < CHUNK_SIZE_X; lx += 1) {
    for (let lz = 0; lz < CHUNK_SIZE_Z; lz += 1) {
      const columnIdx = chunkColumnIndex(lx, lz);
      const terrainHeight = columnHeights[columnIdx];
      const biome = columnBiomes[columnIdx];
      const riverIntensity = columnRivers[columnIdx];
      const worldX = cx * CHUNK_SIZE_X + lx;
      const worldZ = cz * CHUNK_SIZE_Z + lz;
      const leftHeight = getClampedColumnHeight(columnHeights, lx - 1, lz);
      const rightHeight = getClampedColumnHeight(columnHeights, lx + 1, lz);
      const backHeight = getClampedColumnHeight(columnHeights, lx, lz - 1);
      const frontHeight = getClampedColumnHeight(columnHeights, lx, lz + 1);
      const neighborMinHeight = Math.min(leftHeight, rightHeight, backHeight, frontHeight);
      const neighborAvgHeight = (leftHeight + rightHeight + backHeight + frontHeight) * 0.25;
      const channelDepth = neighborAvgHeight - terrainHeight;
      const riverNeighborCount =
        (getClampedColumnRiver(columnRivers, lx - 1, lz) > RIVER_WATER_MIN_INTENSITY ? 1 : 0) +
        (getClampedColumnRiver(columnRivers, lx + 1, lz) > RIVER_WATER_MIN_INTENSITY ? 1 : 0) +
        (getClampedColumnRiver(columnRivers, lx, lz - 1) > RIVER_WATER_MIN_INTENSITY ? 1 : 0) +
        (getClampedColumnRiver(columnRivers, lx, lz + 1) > RIVER_WATER_MIN_INTENSITY ? 1 : 0);
      const riverStrength = THREE.MathUtils.clamp(
        (riverIntensity - RIVER_WATER_MIN_INTENSITY) / (1 - RIVER_WATER_MIN_INTENSITY),
        0,
        1
      );
      if (biome === BIOME.OASIS && riverIntensity > RIVER_WATER_MIN_INTENSITY) {
        const depthRequirement = THREE.MathUtils.lerp(0.6, 0.15, riverStrength);
        if (channelDepth < depthRequirement || riverNeighborCount < 1) continue;
      } else if (biome === BIOME.MANGROVE && riverIntensity > RIVER_WATER_MIN_INTENSITY) {
        const depthRequirement = THREE.MathUtils.lerp(0.52, 0.12, riverStrength);
        if (channelDepth < depthRequirement || riverNeighborCount < 1) continue;
      } else if (biome !== BIOME.SWAMP && riverIntensity > RIVER_WATER_MIN_INTENSITY) {
        const depthRequirement = THREE.MathUtils.lerp(1.0, 0.25, riverStrength);
        if (channelDepth < depthRequirement || riverNeighborCount < 1) continue;
      }

      const waterSurfaceY = getRiverWaterSurfaceY(
        worldX,
        worldZ,
        terrainHeight,
        biome,
        riverIntensity
      );
      if (waterSurfaceY <= terrainHeight + 1) continue;

      // Gravity-safe cap: water cannot exceed lowest immediate spill edge.
      const spillSurfaceY = neighborMinHeight + 1;
      const effectiveSurfaceY = Math.min(waterSurfaceY, spillSurfaceY);
      if (effectiveSurfaceY <= terrainHeight + 1) continue;

      const startY = Math.max(terrainHeight + 1, 0);
      const rimDepthCap = Math.max(1, neighborMinHeight - terrainHeight + 1);
      const maxBiomeDepth =
        biome === BIOME.SWAMP ? 2 : biome === BIOME.OASIS || biome === BIOME.MANGROVE ? 3 : RIVER_WATER_MAX_DEPTH;
      const depthCap = Math.min(
        maxBiomeDepth,
        rimDepthCap + Math.floor(riverStrength * 1.5)
      );
      const endY = Math.min(
        effectiveSurfaceY - 1,
        terrainHeight + depthCap,
        WORLD_HEIGHT - 2
      );
      for (let y = startY; y <= endY; y += 1) {
        if (getLocalBlock(data, lx, y, lz) !== BLOCK.AIR) continue;
        setLocalBlock(data, lx, y, lz, BLOCK.WATER);
      }
    }
  }

  for (let lx = 0; lx < CHUNK_SIZE_X; lx += 1) {
    for (let lz = 0; lz < CHUNK_SIZE_Z; lz += 1) {
      const worldX = cx * CHUNK_SIZE_X + lx;
      const worldZ = cz * CHUNK_SIZE_Z + lz;
      const columnIdx = chunkColumnIndex(lx, lz);
      const top = columnHeights[columnIdx];
      const biome = columnBiomes[columnIdx];
      const maxY = Math.min(top - 2, WORLD_HEIGHT - 3);

      for (let y = 5; y <= maxY; y += 1) {
        if (biome === BIOME.SWAMP && y > SEA_LEVEL - 4) continue;
        if (biome === BIOME.MANGROVE && y > SEA_LEVEL - 3) continue;
        const type = getLocalBlock(data, lx, y, lz);
        if (
          type !== BLOCK.STONE &&
          type !== BLOCK.DIRT &&
          type !== BLOCK.SAND &&
          type !== BLOCK.RED_SAND &&
          type !== BLOCK.BASALT &&
          type !== BLOCK.ASH
        ) {
          continue;
        }
        if (shouldCarveCave(worldX, y, worldZ)) {
          setLocalBlock(data, lx, y, lz, BLOCK.AIR);
        }
      }
    }
  }

  for (let lx = 0; lx < CHUNK_SIZE_X; lx += 1) {
    for (let lz = 0; lz < CHUNK_SIZE_Z; lz += 1) {
      const worldX = cx * CHUNK_SIZE_X + lx;
      const worldZ = cz * CHUNK_SIZE_Z + lz;
      const top = columnHeights[chunkColumnIndex(lx, lz)];
      const maxY = Math.min(top - 1, 48);

      for (let y = 5; y <= maxY; y += 1) {
        const host = getLocalBlock(data, lx, y, lz);
        if (host !== BLOCK.STONE && host !== BLOCK.BASALT) continue;
        const ore = getOreTypeAt(worldX, y, worldZ);
        if (ore !== BLOCK.AIR) {
          setLocalBlock(data, lx, y, lz, ore);
          oreCount += 1;
        }
      }
    }
  }

  for (let lx = 0; lx < CHUNK_SIZE_X; lx += 1) {
    for (let lz = 0; lz < CHUNK_SIZE_Z; lz += 1) {
      const columnIdx = chunkColumnIndex(lx, lz);
      const biome = columnBiomes[columnIdx];
      const topY = columnHeights[columnIdx];
      if (topY <= SEA_LEVEL + 1 && biome !== BIOME.SWAMP && biome !== BIOME.OASIS && biome !== BIOME.MANGROVE) continue;
      if (biome === BIOME.SWAMP && topY < SEA_LEVEL) continue;
      if (biome === BIOME.OASIS && topY < SEA_LEVEL - 1) continue;
      if (biome === BIOME.MANGROVE && topY < SEA_LEVEL - 1) continue;

      const worldX = cx * CHUNK_SIZE_X + lx;
      const worldZ = cz * CHUNK_SIZE_Z + lz;
      if (!isColumnFlatEnoughInChunk(columnHeights, lx, lz, topY)) continue;

      const roll = hash2(worldX * 1.73 + 51, worldZ * 1.37 - 29);

      if (biome === BIOME.DESERT) {
        const nearRiver = columnRivers[columnIdx] > 0.25;
        if (nearRiver) continue;
        if (roll > 0.978 && tryPlaceCactusInChunk(data, lx, topY + 1, lz, worldX, worldZ)) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.OASIS) {
        const nearWater = columnRivers[columnIdx] > 0.28 || topY <= SEA_LEVEL + 3;
        if (nearWater && roll < 0.94) continue;
        if (!nearWater && roll < 0.988) continue;

        const variantRoll = hash2(worldX * 0.46 + 27, worldZ * 0.46 - 58);
        let placed = false;
        if (variantRoll > 0.68) {
          placed = tryPlacePalmInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.46) {
          placed = tryPlaceAcaciaInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.24) {
          placed = tryPlaceJungleTreeInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else {
          placed = tryPlaceCactusInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        }
        if (placed) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.MANGROVE) {
        if (columnRivers[columnIdx] > 0.62 && topY <= SEA_LEVEL + 2) continue;
        const nearWater = columnRivers[columnIdx] > 0.34 || topY <= SEA_LEVEL + 2;
        if (nearWater && roll < 0.948) continue;
        if (!nearWater && roll < 0.984) continue;

        const variantRoll = hash2(worldX * 0.51 + 64, worldZ * 0.51 - 48);
        let placed = false;
        if (variantRoll > 0.72) {
          placed = tryPlaceWillowInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.52) {
          placed = tryPlacePalmInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.34) {
          placed = tryPlaceJungleTreeInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.2) {
          placed = tryPlaceBroadleafTreeInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else {
          placed = tryPlaceForkedOakInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        }
        if (placed) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.BADLANDS) {
        if (columnRivers[columnIdx] > 0.34) continue;
        const variantRoll = hash2(worldX * 0.44 + 18, worldZ * 0.44 - 39);
        let placed = false;
        if (roll > 0.99 && variantRoll > 0.62) {
          placed = tryPlaceAcaciaTwinInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (roll > 0.986 && variantRoll > 0.3) {
          placed = tryPlaceAcaciaInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (roll > 0.978) {
          placed = tryPlaceCactusInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        }
        if (placed) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.MESA) {
        if (columnRivers[columnIdx] > 0.44) continue;
        const variantRoll = hash2(worldX * 0.47 + 34, worldZ * 0.47 - 12);
        let placed = false;
        if (roll > 0.982 && variantRoll > 0.68) {
          placed = tryPlaceAcaciaTwinInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (roll > 0.976 && variantRoll > 0.22) {
          placed = tryPlaceAcaciaInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (roll > 0.995) {
          placed = tryPlaceCactusInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        }
        if (placed) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.VOLCANIC) {
        continue;
      }

      if (biome === BIOME.ALPINE) {
        const selector = hash2(worldX * 0.61 + 37, worldZ * 0.61 - 14);
        const placed = selector > 0.68
          ? tryPlaceTallPineInChunk(data, lx, topY + 1, lz, worldX, worldZ)
          : selector > 0.36
            ? tryPlacePineInChunk(data, lx, topY + 1, lz, worldX, worldZ)
            : tryPlaceFirInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        if (roll > 0.966 && placed) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.TUNDRA) {
        if (roll < 0.982) continue;
        const selector = hash2(worldX * 0.44 - 91, worldZ * 0.44 + 66);
        const placed = selector > 0.66
          ? tryPlaceTallPineInChunk(data, lx, topY + 1, lz, worldX, worldZ)
          : selector > 0.38
            ? tryPlaceFirInChunk(data, lx, topY + 1, lz, worldX, worldZ)
            : tryPlacePineInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        if (placed) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.GLACIER) {
        if (topY <= SEA_LEVEL + 6 || roll < 0.989) continue;
        const selector = hash2(worldX * 0.36 - 77, worldZ * 0.36 + 93);
        const placed = selector > 0.68
          ? tryPlaceTallPineInChunk(data, lx, topY + 1, lz, worldX, worldZ)
          : selector > 0.34
            ? tryPlaceFirInChunk(data, lx, topY + 1, lz, worldX, worldZ)
            : tryPlacePineInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        if (placed) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.REDWOOD) {
        if (roll < 0.936) continue;
        const variantRoll = hash2(worldX * 0.39 + 83, worldZ * 0.39 - 37);
        let placed = false;
        if (variantRoll > 0.78) {
          placed = tryPlaceRedwoodInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.56) {
          placed = tryPlaceTallPineInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.34) {
          placed = tryPlaceFirInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.18) {
          placed = tryPlacePineInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else {
          placed = tryPlaceBroadleafTreeInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        }
        if (placed) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.HEATH) {
        if (roll < 0.968) continue;
        const selector = hash2(worldX * 0.41 - 73, worldZ * 0.41 + 55);
        let placed = false;
        if (topY > SEA_LEVEL + 15 && selector > 0.44) {
          placed = tryPlaceTallPineInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (selector > 0.7) {
          placed = tryPlaceFirInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (selector > 0.48) {
          placed = tryPlacePineInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (selector > 0.3) {
          placed = tryPlaceBirchInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else {
          placed = tryPlaceForkedOakInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        }
        if (placed) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.STEPPE) {
        if (roll < 0.977) continue;
        const selector = hash2(worldX * 0.53 - 86, worldZ * 0.53 + 28);
        let placed = false;
        if (selector > 0.72) {
          placed = tryPlaceAcaciaInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (selector > 0.52) {
          placed = tryPlaceForkedOakInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (selector > 0.34) {
          placed = tryPlaceBirchInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (selector > 0.18) {
          placed = tryPlaceTreeInChunk(data, lx, topY + 1, lz, worldX, worldZ, 3);
        } else {
          placed = tryPlacePineInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        }
        if (placed) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.SWAMP) {
        if (columnRivers[columnIdx] > 0.58 && topY <= SEA_LEVEL + 2) continue;
        if (topY <= SEA_LEVEL + 1 && roll < 0.988) continue;
        if (roll < 0.955) continue;

        const variantRoll = hash2(worldX * 0.63 + 21, worldZ * 0.63 - 77);
        let placed = false;
        if (variantRoll > 0.72) {
          placed = tryPlaceWillowInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.55) {
          placed = tryPlaceTallPineInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.38) {
          placed = tryPlaceBroadleafTreeInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.24) {
          placed = tryPlaceForkedOakInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.12) {
          placed = tryPlaceTreeInChunk(data, lx, topY + 1, lz, worldX, worldZ, 3);
        } else {
          placed = tryPlaceBirchInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        }

        if (placed) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.SAVANNA) {
        if (roll < 0.972) continue;
        const variantRoll = hash2(worldX * 0.52 + 16, worldZ * 0.52 - 33);
        let placed = false;
        if (variantRoll > 0.74) {
          placed = tryPlaceAcaciaTwinInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.32) {
          placed = tryPlaceAcaciaInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.16) {
          placed = tryPlaceTreeInChunk(data, lx, topY + 1, lz, worldX, worldZ, 2);
        } else {
          placed = tryPlaceForkedOakInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        }
        if (placed) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.JUNGLE) {
        if (roll < 0.9) continue;
        const variantRoll = hash2(worldX * 0.43 + 72, worldZ * 0.43 - 105);
        let placed = false;
        if (variantRoll > 0.82) {
          placed = tryPlaceMegaJungleInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.6) {
          placed = tryPlaceJungleTreeInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.42) {
          placed = tryPlaceWideOakInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.24) {
          placed = tryPlaceForkedOakInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.12) {
          placed = tryPlaceBroadleafTreeInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else {
          placed = tryPlaceTreeInChunk(data, lx, topY + 1, lz, worldX, worldZ, 4);
        }

        if (placed) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.CHERRY_GROVE) {
        if (roll < 0.952) continue;
        const variantRoll = hash2(worldX * 0.58 + 91, worldZ * 0.58 - 65);
        let placed = false;
        if (variantRoll > 0.78) {
          placed = tryPlaceWeepingCherryInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.56) {
          placed = tryPlaceCherryTreeInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.36) {
          placed = tryPlaceBirchInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.18) {
          placed = tryPlaceWideOakInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else {
          placed = tryPlaceTreeInChunk(data, lx, topY + 1, lz, worldX, worldZ, 3);
        }

        if (placed) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.FOREST || biome === BIOME.PLAINS) {
        const threshold = biome === BIOME.FOREST ? 0.93 : 0.983;
        if (roll < threshold) continue;

        const variantRoll = hash2(worldX * 0.57 + 109, worldZ * 0.57 - 61);
        let placed = false;
        if (variantRoll > 0.82) {
          placed = tryPlaceWideOakInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.66) {
          placed = tryPlaceBroadleafTreeInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.5) {
          placed = tryPlaceForkedOakInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else if (variantRoll > 0.32) {
          placed = tryPlaceBirchInChunk(data, lx, topY + 1, lz, worldX, worldZ);
        } else {
          const trunkBaseHeight = biome === BIOME.FOREST ? 4 : 3;
          placed = tryPlaceTreeInChunk(data, lx, topY + 1, lz, worldX, worldZ, trunkBaseHeight);
        }

        if (placed) {
          treeCount += 1;
        }
      }
    }
  }

  for (let lx = 0; lx < CHUNK_SIZE_X; lx += 1) {
    for (let lz = 0; lz < CHUNK_SIZE_Z; lz += 1) {
      const columnIdx = chunkColumnIndex(lx, lz);
      const biome = columnBiomes[columnIdx];
      const topY = columnHeights[columnIdx];
      if (topY <= SEA_LEVEL && biome !== BIOME.SWAMP && biome !== BIOME.OASIS && biome !== BIOME.MANGROVE) continue;
      if (biome === BIOME.SWAMP && topY < SEA_LEVEL) continue;
      if (biome === BIOME.OASIS && topY < SEA_LEVEL - 1) continue;
      if (biome === BIOME.MANGROVE && topY < SEA_LEVEL - 1) continue;

      const baseY = topY + 1;
      if (baseY >= WORLD_HEIGHT) continue;
      if (getLocalBlock(data, lx, baseY, lz) !== BLOCK.AIR) continue;

      const worldX = cx * CHUNK_SIZE_X + lx;
      const worldZ = cz * CHUNK_SIZE_Z + lz;
      const river = columnRivers[columnIdx];

      const floraRoll = hash2(worldX * 2.17 - 83, worldZ * 2.17 + 41);
      const flowerPick = hash2(worldX * 1.17 + 13, worldZ * 1.17 - 19);

      if (biome === BIOME.DESERT) {
        if (river > 0.24) continue;
        if (floraRoll > 0.992 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.DEAD_BUSH)) {
          treeCount += 1;
        } else if (floraRoll > 0.978 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.DRY_GRASS)) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.OASIS) {
        const wetPatch = river > 0.32 || topY <= SEA_LEVEL + 2;
        if (wetPatch && floraRoll > 0.9 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.CATTAIL)) {
          treeCount += 1;
        } else if (wetPatch && floraRoll > 0.83 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.REED)) {
          treeCount += 1;
        } else if (
          floraRoll > 0.952 &&
          tryPlaceLargeBushClusterInChunk(data, lx, baseY, lz, worldX, worldZ, BLOCK.BERRY_BUSH, true)
        ) {
          treeCount += 1;
        } else if (floraRoll > 0.9 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.MEADOW_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.84 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.WILD_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.78 && tryPlaceBushInChunk(data, lx, baseY, lz, BLOCK.SHRUB, true)) {
          treeCount += 1;
        } else if (floraRoll > 0.74) {
          const flowerType = flowerPick > 0.52 ? BLOCK.FLOWER_YELLOW : BLOCK.FLOWER_BLUE;
          if (tryPlaceSingleFlora(data, lx, baseY, lz, flowerType)) {
            treeCount += 1;
          }
        } else if (floraRoll > 0.968 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.DEAD_BUSH)) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.MANGROVE) {
        const wetPatch = river > 0.34 || topY <= SEA_LEVEL + 2;
        if (wetPatch && floraRoll > 0.89 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.CATTAIL)) {
          treeCount += 1;
        } else if (wetPatch && floraRoll > 0.82 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.REED)) {
          treeCount += 1;
        } else if (
          floraRoll > 0.946 &&
          tryPlaceLargeBushClusterInChunk(data, lx, baseY, lz, worldX, worldZ, BLOCK.BERRY_BUSH)
        ) {
          treeCount += 1;
        } else if (floraRoll > 0.9 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.FERN)) {
          treeCount += 1;
        } else if (floraRoll > 0.85 && tryPlaceBushInChunk(data, lx, baseY, lz, BLOCK.BERRY_BUSH)) {
          treeCount += 1;
        } else if (floraRoll > 0.8 && tryPlaceBushInChunk(data, lx, baseY, lz, BLOCK.SHRUB)) {
          treeCount += 1;
        } else if (floraRoll > 0.74 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.MEADOW_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.7 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.WILD_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.66) {
          const flowerType = flowerPick > 0.5 ? BLOCK.FLOWER_BLUE : BLOCK.FLOWER_YELLOW;
          if (tryPlaceSingleFlora(data, lx, baseY, lz, flowerType)) {
            treeCount += 1;
          }
        }
        continue;
      }

      if (biome === BIOME.BADLANDS) {
        if (river > 0.36) continue;
        if (
          floraRoll > 0.994 &&
          tryPlaceLargeBushClusterInChunk(data, lx, baseY, lz, worldX, worldZ, BLOCK.SHRUB, true)
        ) {
          treeCount += 1;
        } else if (floraRoll > 0.978 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.DEAD_BUSH)) {
          treeCount += 1;
        } else if (floraRoll > 0.962 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.DRY_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.946 && tryPlaceBushInChunk(data, lx, baseY, lz, BLOCK.SHRUB, true)) {
          treeCount += 1;
        } else if (floraRoll > 0.992 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.FLOWER_YELLOW)) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.MESA) {
        if (river > 0.42) continue;
        if (
          floraRoll > 0.994 &&
          tryPlaceLargeBushClusterInChunk(data, lx, baseY, lz, worldX, worldZ, BLOCK.SHRUB, true)
        ) {
          treeCount += 1;
        } else if (floraRoll > 0.972 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.DEAD_BUSH)) {
          treeCount += 1;
        } else if (floraRoll > 0.958 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.DRY_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.944 && tryPlaceBushInChunk(data, lx, baseY, lz, BLOCK.SHRUB, true)) {
          treeCount += 1;
        } else if (floraRoll > 0.994 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.FLOWER_YELLOW)) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.VOLCANIC) {
        if (floraRoll > 0.988 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.DEAD_BUSH)) {
          treeCount += 1;
        } else if (floraRoll > 0.972 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.DRY_GRASS)) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.ALPINE) {
        if (floraRoll > 0.992 && tryPlaceBushInChunk(data, lx, baseY, lz, BLOCK.SHRUB)) {
          treeCount += 1;
        } else if (floraRoll > 0.978 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.WILD_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.964 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.MEADOW_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.948 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.TALL_GRASS)) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.TUNDRA) {
        if (floraRoll > 0.992 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.DEAD_BUSH)) {
          treeCount += 1;
        } else if (floraRoll > 0.982 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.DRY_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.968 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.WILD_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.958 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.TALL_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.946 && tryPlaceBushInChunk(data, lx, baseY, lz, BLOCK.SHRUB)) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.GLACIER) {
        if (floraRoll > 0.996 && tryPlaceBushInChunk(data, lx, baseY, lz, BLOCK.SHRUB)) {
          treeCount += 1;
        } else if (floraRoll > 0.989 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.DEAD_BUSH)) {
          treeCount += 1;
        } else if (floraRoll > 0.976 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.DRY_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.962 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.WILD_GRASS)) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.REDWOOD) {
        if (
          floraRoll > 0.948 &&
          tryPlaceLargeBushClusterInChunk(data, lx, baseY, lz, worldX, worldZ, BLOCK.BERRY_BUSH)
        ) {
          treeCount += 1;
        } else if (floraRoll > 0.9 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.FERN)) {
          treeCount += 1;
        } else if (floraRoll > 0.86 && tryPlaceBushInChunk(data, lx, baseY, lz, BLOCK.BERRY_BUSH)) {
          treeCount += 1;
        } else if (floraRoll > 0.8 && tryPlaceBushInChunk(data, lx, baseY, lz, BLOCK.SHRUB)) {
          treeCount += 1;
        } else if (floraRoll > 0.74 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.MEADOW_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.7 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.WILD_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.67) {
          if (tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.FLOWER_BLUE)) {
            treeCount += 1;
          }
        }
        continue;
      }

      if (biome === BIOME.HEATH) {
        if (
          floraRoll > 0.978 &&
          tryPlaceLargeBushClusterInChunk(data, lx, baseY, lz, worldX, worldZ, BLOCK.SHRUB)
        ) {
          treeCount += 1;
        } else if (floraRoll > 0.93 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.DRY_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.88 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.WILD_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.84 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.MEADOW_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.79 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.TALL_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.74 && tryPlaceBushInChunk(data, lx, baseY, lz, BLOCK.SHRUB)) {
          treeCount += 1;
        } else if (floraRoll > 0.71) {
          const flowerType = flowerPick > 0.66
            ? BLOCK.BLOSSOM_FLOWER
            : flowerPick > 0.33
              ? BLOCK.FLOWER_BLUE
              : BLOCK.FLOWER_YELLOW;
          if (tryPlaceSingleFlora(data, lx, baseY, lz, flowerType)) {
            treeCount += 1;
          }
        }
        continue;
      }

      if (biome === BIOME.STEPPE) {
        if (
          floraRoll > 0.984 &&
          tryPlaceLargeBushClusterInChunk(data, lx, baseY, lz, worldX, worldZ, BLOCK.SHRUB, true)
        ) {
          treeCount += 1;
        } else if (floraRoll > 0.94 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.DRY_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.89 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.WILD_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.84 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.MEADOW_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.8 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.TALL_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.76 && tryPlaceBushInChunk(data, lx, baseY, lz, BLOCK.SHRUB, true)) {
          treeCount += 1;
        } else if (floraRoll > 0.72) {
          const flowerType = flowerPick > 0.66
            ? BLOCK.FLOWER_YELLOW
            : flowerPick > 0.33
              ? BLOCK.FLOWER_BLUE
              : BLOCK.FLOWER_RED;
          if (tryPlaceSingleFlora(data, lx, baseY, lz, flowerType)) {
            treeCount += 1;
          }
        } else if (floraRoll > 0.97 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.DEAD_BUSH)) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.SWAMP) {
        const wetPatch = river > 0.42 || topY <= SEA_LEVEL + 1;
        if (wetPatch && floraRoll > 0.9 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.CATTAIL)) {
          treeCount += 1;
        } else if (wetPatch && floraRoll > 0.84 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.REED)) {
          treeCount += 1;
        } else if (
          floraRoll > 0.942 &&
          tryPlaceLargeBushClusterInChunk(data, lx, baseY, lz, worldX, worldZ, BLOCK.BERRY_BUSH)
        ) {
          treeCount += 1;
        } else if (floraRoll > 0.91 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.FERN)) {
          treeCount += 1;
        } else if (floraRoll > 0.87 && tryPlaceBushInChunk(data, lx, baseY, lz, BLOCK.BERRY_BUSH)) {
          treeCount += 1;
        } else if (floraRoll > 0.82 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.MEADOW_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.77 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.TALL_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.72 && tryPlaceBushInChunk(data, lx, baseY, lz, BLOCK.SHRUB)) {
          treeCount += 1;
        } else if (floraRoll > 0.68) {
          const flowerType = flowerPick > 0.52 ? BLOCK.FLOWER_BLUE : BLOCK.FLOWER_YELLOW;
          if (tryPlaceSingleFlora(data, lx, baseY, lz, flowerType)) {
            treeCount += 1;
          }
        }
        continue;
      }

      if (biome === BIOME.SAVANNA) {
        if (
          floraRoll > 0.974 &&
          tryPlaceLargeBushClusterInChunk(data, lx, baseY, lz, worldX, worldZ, BLOCK.SHRUB, true)
        ) {
          treeCount += 1;
        } else if (floraRoll > 0.91 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.DRY_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.84 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.WILD_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.76) {
          if (tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.FLOWER_YELLOW)) {
            treeCount += 1;
          }
        } else if (floraRoll > 0.972 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.DEAD_BUSH)) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.JUNGLE) {
        if (
          floraRoll > 0.938 &&
          tryPlaceLargeBushClusterInChunk(data, lx, baseY, lz, worldX, worldZ, BLOCK.BERRY_BUSH)
        ) {
          treeCount += 1;
        } else if (floraRoll > 0.89 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.FERN)) {
          treeCount += 1;
        } else if (floraRoll > 0.83 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.MEADOW_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.79 && tryPlaceBushInChunk(data, lx, baseY, lz, BLOCK.BERRY_BUSH)) {
          treeCount += 1;
        } else if (floraRoll > 0.74 && tryPlaceBushInChunk(data, lx, baseY, lz, BLOCK.SHRUB)) {
          treeCount += 1;
        } else if (floraRoll > 0.72) {
          const flowerType = flowerPick > 0.52 ? BLOCK.FLOWER_BLUE : BLOCK.FLOWER_YELLOW;
          if (tryPlaceSingleFlora(data, lx, baseY, lz, flowerType)) {
            treeCount += 1;
          }
        }
        continue;
      }

      if (biome === BIOME.CHERRY_GROVE) {
        if (
          floraRoll > 0.966 &&
          tryPlaceLargeBushClusterInChunk(data, lx, baseY, lz, worldX, worldZ, BLOCK.BERRY_BUSH)
        ) {
          treeCount += 1;
        } else if (floraRoll > 0.89 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.BLOSSOM_FLOWER)) {
          treeCount += 1;
        } else if (floraRoll > 0.84 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.MEADOW_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.79 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.TALL_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.73) {
          const flowerType = flowerPick > 0.5 ? BLOCK.BLOSSOM_FLOWER : BLOCK.FLOWER_RED;
          if (tryPlaceSingleFlora(data, lx, baseY, lz, flowerType)) {
            treeCount += 1;
          }
        } else if (floraRoll > 0.75 && tryPlaceBushInChunk(data, lx, baseY, lz, BLOCK.BERRY_BUSH)) {
          treeCount += 1;
        }
        continue;
      }

      if (biome === BIOME.FOREST) {
        if (
          floraRoll > 0.976 &&
          tryPlaceLargeBushClusterInChunk(data, lx, baseY, lz, worldX, worldZ, BLOCK.SHRUB)
        ) {
          treeCount += 1;
        } else if (floraRoll > 0.948 && tryPlaceBushInChunk(data, lx, baseY, lz, BLOCK.BERRY_BUSH)) {
          treeCount += 1;
        } else if (floraRoll > 0.89 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.MEADOW_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.84 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.WILD_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.8 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.TALL_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.8) {
          const flowerType = flowerPick > 0.66
            ? BLOCK.FLOWER_RED
            : flowerPick > 0.33
              ? BLOCK.FLOWER_YELLOW
              : BLOCK.FLOWER_BLUE;
          if (tryPlaceSingleFlora(data, lx, baseY, lz, flowerType)) {
            treeCount += 1;
          }
        }
        continue;
      }

      if (biome === BIOME.PLAINS) {
        if (
          floraRoll > 0.988 &&
          tryPlaceLargeBushClusterInChunk(data, lx, baseY, lz, worldX, worldZ, BLOCK.SHRUB)
        ) {
          treeCount += 1;
        } else if (floraRoll > 0.94 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.MEADOW_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.89 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.WILD_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.84 && tryPlaceSingleFlora(data, lx, baseY, lz, BLOCK.TALL_GRASS)) {
          treeCount += 1;
        } else if (floraRoll > 0.79) {
          const flowerType = flowerPick > 0.66
            ? BLOCK.FLOWER_RED
            : flowerPick > 0.33
              ? BLOCK.FLOWER_YELLOW
              : BLOCK.FLOWER_BLUE;
          if (tryPlaceSingleFlora(data, lx, baseY, lz, flowerType)) {
            treeCount += 1;
          }
        } else if (floraRoll > 0.75 && tryPlaceBushInChunk(data, lx, baseY, lz, BLOCK.SHRUB)) {
          treeCount += 1;
        }
      }
    }
  }

  return { data, treeCount, oreCount };
}

function getBlockAtWorld(worldX, y, worldZ) {
  if (y < 0 || y >= WORLD_HEIGHT) return BLOCK.AIR;

  const cx = worldToChunkCoord(worldX, CHUNK_SIZE_X);
  const cz = worldToChunkCoord(worldZ, CHUNK_SIZE_Z);
  const chunk = activeChunks.get(chunkKey(cx, cz));
  if (!chunk) return BLOCK.AIR;

  const lx = worldX - cx * CHUNK_SIZE_X;
  const lz = worldZ - cz * CHUNK_SIZE_Z;
  return getLocalBlock(chunk.data, lx, y, lz);
}

function blockVariation(worldX, y, worldZ) {
  return 0.9 + hash2(worldX * 1.21 + y * 0.33, worldZ * 1.07 - y * 0.71) * 0.16;
}

function isFloraBlock(type) {
  return (
    type === BLOCK.BUSH ||
    type === BLOCK.SHRUB ||
    type === BLOCK.BERRY_BUSH ||
    type === BLOCK.FLOWER_RED ||
    type === BLOCK.FLOWER_YELLOW ||
    type === BLOCK.FLOWER_BLUE ||
    type === BLOCK.BLOSSOM_FLOWER ||
    type === BLOCK.TALL_GRASS ||
    type === BLOCK.MEADOW_GRASS ||
    type === BLOCK.WILD_GRASS ||
    type === BLOCK.DRY_GRASS ||
    type === BLOCK.FERN ||
    type === BLOCK.DEAD_BUSH ||
    type === BLOCK.REED ||
    type === BLOCK.CATTAIL
  );
}

function isWaterBlock(type) {
  return type === BLOCK.WATER;
}

function isLeafLikeBlock(type) {
  return (
    type === BLOCK.LEAVES ||
    type === BLOCK.BIRCH_LEAVES ||
    type === BLOCK.JUNGLE_LEAVES ||
    type === BLOCK.ACACIA_LEAVES ||
    type === BLOCK.CHERRY_LEAVES ||
    type === BLOCK.BUSH ||
    type === BLOCK.SHRUB ||
    type === BLOCK.BERRY_BUSH
  );
}

function isOccludingBlock(type) {
  return type !== BLOCK.AIR && !isFloraBlock(type) && !isWaterBlock(type);
}

function createFloraTexture(kind) {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";

  if (kind === "grass") {
    ctx.lineCap = "round";
    ctx.lineWidth = 4;
    for (let i = 0; i < 9; i += 1) {
      const x = 8 + i * 6;
      const sway = ((i % 3) - 1) * 5;
      ctx.beginPath();
      ctx.moveTo(x, 62);
      ctx.lineTo(x + sway, 14 + (i % 2) * 6);
      ctx.stroke();
    }
  } else if (kind === "meadowGrass") {
    ctx.lineCap = "round";
    ctx.lineWidth = 4;
    for (let i = 0; i < 11; i += 1) {
      const x = 6 + i * 5;
      const sway = ((i % 4) - 1.5) * 4;
      const topY = 10 + (i % 3) * 5;
      ctx.beginPath();
      ctx.moveTo(x, 62);
      ctx.lineTo(x + sway, topY);
      ctx.stroke();
    }
  } else if (kind === "wildGrass") {
    ctx.lineCap = "round";
    ctx.lineWidth = 3;
    for (let i = 0; i < 10; i += 1) {
      const x = 7 + i * 5.4;
      const sway = ((i % 5) - 2) * 4;
      const topY = 16 + (i % 4) * 6;
      ctx.beginPath();
      ctx.moveTo(x, 62);
      ctx.lineTo(x + sway, topY);
      ctx.stroke();
    }
  } else if (kind === "dryGrass") {
    ctx.lineCap = "round";
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i += 1) {
      const x = 10 + i * 6.2;
      const sway = ((i % 3) - 1) * 3;
      const topY = 22 + (i % 3) * 6;
      ctx.beginPath();
      ctx.moveTo(x, 62);
      ctx.lineTo(x + sway, topY);
      ctx.stroke();
    }
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, 48);
    ctx.lineTo(8, 38);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(46, 50);
    ctx.lineTo(56, 39);
    ctx.stroke();
  } else if (kind === "shrub") {
    ctx.beginPath();
    ctx.arc(20, 40, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(34, 32, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(48, 40, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(32, 46, 14, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "berryBush") {
    ctx.beginPath();
    ctx.arc(19, 40, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(32, 33, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(45, 40, 12, 0, Math.PI * 2);
    ctx.fill();
    const berries = [
      [18, 41, 2.2],
      [25, 35, 2.4],
      [31, 45, 2.1],
      [39, 34, 2.3],
      [45, 43, 2.0],
      [27, 48, 1.9],
      [36, 40, 2.2],
    ];
    for (const berry of berries) {
      ctx.beginPath();
      ctx.arc(berry[0], berry[1], berry[2], 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === "fern") {
    ctx.lineCap = "round";
    ctx.lineWidth = 3;
    const fronds = [
      [32, 62, 20, 30],
      [32, 62, 44, 28],
      [32, 62, 32, 20],
      [30, 54, 16, 40],
      [34, 54, 48, 40],
      [30, 46, 19, 33],
      [34, 46, 45, 34],
    ];
    for (const frond of fronds) {
      ctx.beginPath();
      ctx.moveTo(frond[0], frond[1]);
      ctx.lineTo(frond[2], frond[3]);
      ctx.stroke();
    }
  } else if (kind === "flower") {
    ctx.lineCap = "round";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(32, 62);
    ctx.lineTo(32, 28);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(32, 22, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(24, 18, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(40, 18, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "dead") {
    ctx.lineCap = "round";
    ctx.lineWidth = 4;
    const branches = [
      [32, 62, 32, 40],
      [32, 48, 20, 34],
      [32, 50, 45, 36],
      [28, 44, 16, 45],
      [36, 44, 49, 47],
    ];
    for (const branch of branches) {
      ctx.beginPath();
      ctx.moveTo(branch[0], branch[1]);
      ctx.lineTo(branch[2], branch[3]);
      ctx.stroke();
    }
  } else if (kind === "reed") {
    ctx.lineCap = "round";
    ctx.lineWidth = 4;
    const blades = [
      [16, 62, 16, 16],
      [31, 62, 30, 10],
      [48, 62, 50, 14],
      [22, 58, 28, 20],
      [42, 58, 36, 18],
    ];
    for (const blade of blades) {
      ctx.beginPath();
      ctx.moveTo(blade[0], blade[1]);
      ctx.lineTo(blade[2], blade[3]);
      ctx.stroke();
    }
  } else if (kind === "cattail") {
    ctx.lineCap = "round";
    ctx.lineWidth = 3;
    const stems = [
      [20, 62, 20, 14],
      [33, 62, 32, 10],
      [44, 62, 45, 16],
    ];
    for (const stem of stems) {
      ctx.beginPath();
      ctx.moveTo(stem[0], stem[1]);
      ctx.lineTo(stem[2], stem[3]);
      ctx.stroke();
    }

    ctx.lineWidth = 5;
    const cattails = [
      [20, 20, 20, 10],
      [32, 16, 32, 6],
      [45, 22, 45, 12],
    ];
    for (const head of cattails) {
      ctx.beginPath();
      ctx.moveTo(head[0], head[1]);
      ctx.lineTo(head[2], head[3]);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.arc(32, 30, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(22, 36, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(42, 36, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createFloraMaterialFromTexture(texture) {
  return new THREE.MeshLambertMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    vertexColors: true,
  });
}

function createFloraMaterials() {
  const bushTexture = createFloraTexture("bush");
  const shrubTexture = createFloraTexture("shrub");
  const berryBushTexture = createFloraTexture("berryBush");
  const grassTexture = createFloraTexture("grass");
  const meadowGrassTexture = createFloraTexture("meadowGrass");
  const wildGrassTexture = createFloraTexture("wildGrass");
  const dryGrassTexture = createFloraTexture("dryGrass");
  const fernTexture = createFloraTexture("fern");
  const flowerTexture = createFloraTexture("flower");
  const deadTexture = createFloraTexture("dead");
  const reedTexture = createFloraTexture("reed");
  const cattailTexture = createFloraTexture("cattail");

  return {
    [BLOCK.BUSH]: createFloraMaterialFromTexture(bushTexture),
    [BLOCK.SHRUB]: createFloraMaterialFromTexture(shrubTexture),
    [BLOCK.BERRY_BUSH]: createFloraMaterialFromTexture(berryBushTexture),
    [BLOCK.TALL_GRASS]: createFloraMaterialFromTexture(grassTexture),
    [BLOCK.MEADOW_GRASS]: createFloraMaterialFromTexture(meadowGrassTexture),
    [BLOCK.WILD_GRASS]: createFloraMaterialFromTexture(wildGrassTexture),
    [BLOCK.DRY_GRASS]: createFloraMaterialFromTexture(dryGrassTexture),
    [BLOCK.FERN]: createFloraMaterialFromTexture(fernTexture),
    [BLOCK.FLOWER_RED]: createFloraMaterialFromTexture(flowerTexture),
    [BLOCK.FLOWER_YELLOW]: createFloraMaterialFromTexture(flowerTexture),
    [BLOCK.FLOWER_BLUE]: createFloraMaterialFromTexture(flowerTexture),
    [BLOCK.BLOSSOM_FLOWER]: createFloraMaterialFromTexture(flowerTexture),
    [BLOCK.DEAD_BUSH]: createFloraMaterialFromTexture(deadTexture),
    [BLOCK.REED]: createFloraMaterialFromTexture(reedTexture),
    [BLOCK.CATTAIL]: createFloraMaterialFromTexture(cattailTexture),
  };
}

function getFloraShape(type) {
  if (type === BLOCK.BUSH) return { width: 1.05, height: 0.95, quads: 3, jitter: 0.08 };
  if (type === BLOCK.SHRUB) return { width: 1.3, height: 1.12, quads: 4, jitter: 0.11 };
  if (type === BLOCK.BERRY_BUSH) return { width: 1.34, height: 1.16, quads: 4, jitter: 0.1 };
  if (type === BLOCK.TALL_GRASS) return { width: 0.85, height: 0.9, quads: 2, jitter: 0.1 };
  if (type === BLOCK.MEADOW_GRASS) return { width: 0.98, height: 1.26, quads: 3, jitter: 0.12 };
  if (type === BLOCK.WILD_GRASS) return { width: 0.92, height: 1.1, quads: 3, jitter: 0.11 };
  if (type === BLOCK.DRY_GRASS) return { width: 0.9, height: 0.98, quads: 2, jitter: 0.1 };
  if (type === BLOCK.FERN) return { width: 0.92, height: 0.84, quads: 3, jitter: 0.11 };
  if (type === BLOCK.REED) return { width: 0.54, height: 1.22, quads: 2, jitter: 0.09 };
  if (type === BLOCK.CATTAIL) return { width: 0.5, height: 1.36, quads: 2, jitter: 0.08 };
  if (type === BLOCK.BLOSSOM_FLOWER) return { width: 0.68, height: 1.0, quads: 2, jitter: 0.07 };
  if (type === BLOCK.DEAD_BUSH) return { width: 0.72, height: 0.72, quads: 2, jitter: 0.06 };
  return { width: 0.62, height: 0.95, quads: 2, jitter: 0.06 };
}

function pushFloraQuad(buffer, centerX, baseY, centerZ, angle, width, height, r, g, b) {
  const halfWidth = width * 0.5;
  const dx = Math.cos(angle) * halfWidth;
  const dz = Math.sin(angle) * halfWidth;
  const corners = [
    [centerX - dx, baseY, centerZ - dz],
    [centerX + dx, baseY, centerZ + dz],
    [centerX + dx, baseY + height, centerZ + dz],
    [centerX - dx, baseY + height, centerZ - dz],
  ];
  const normalX = Math.sin(angle);
  const normalZ = -Math.cos(angle);
  const uvs = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];

  for (const cornerIndex of TRIANGLE_ORDER) {
    const corner = corners[cornerIndex];
    buffer.positions.push(corner[0], corner[1], corner[2]);
    buffer.normals.push(normalX, 0, normalZ);
    buffer.colors.push(r, g, b);
    buffer.uvs.push(uvs[cornerIndex][0], uvs[cornerIndex][1]);
  }

  buffer.quadCount += 1;
}

function addFloraBillboards(buffer, type, lx, y, lz, worldX, worldZ, baseColor, variation) {
  const shape = getFloraShape(type);
  const rootX = lx + 0.5 + (hash2(worldX * 3.17 + 9, worldZ * 3.17 - 11) - 0.5) * shape.jitter;
  const rootZ = lz + 0.5 + (hash2(worldX * 4.29 - 7, worldZ * 4.29 + 5) - 0.5) * shape.jitter;
  const baseAngle = hash2(worldX * 0.73 + 17, worldZ * 0.73 - 23) * Math.PI;
  let light = 0.96;
  if (type === BLOCK.DEAD_BUSH || type === BLOCK.DRY_GRASS) light = 0.82;
  else if (type === BLOCK.BLOSSOM_FLOWER || type === BLOCK.BERRY_BUSH) light = 1.03;
  else if (type === BLOCK.MEADOW_GRASS) light = 1.0;
  const r = THREE.MathUtils.clamp(baseColor.r * variation * light, 0, 1);
  const g = THREE.MathUtils.clamp(baseColor.g * variation * light, 0, 1);
  const b = THREE.MathUtils.clamp(baseColor.b * variation * light, 0, 1);

  const startQuadCount = buffer.quadCount;
  for (let i = 0; i < shape.quads; i += 1) {
    const quadAngle = baseAngle + (Math.PI * i) / shape.quads;
    const quadWidth = shape.width * (0.88 + hash2(worldX + i * 11, worldZ - i * 13) * 0.24);
    const quadHeight = shape.height * (0.9 + hash2(worldX - i * 7, worldZ + i * 5) * 0.22);
    pushFloraQuad(buffer, rootX, y, rootZ, quadAngle, quadWidth, quadHeight, r, g, b);
  }

  return buffer.quadCount - startQuadCount;
}

function disposeChunkMesh(chunk) {
  if (chunk.mesh) {
    chunk.mesh.geometry.dispose();
    scene.remove(chunk.mesh);
    chunk.mesh = null;
  }

  if (chunk.waterMesh) {
    chunk.waterMesh.geometry.dispose();
    scene.remove(chunk.waterMesh);
    chunk.waterMesh = null;
  }

  if (!chunk.floraMeshes) {
    chunk.floraMeshes = [];
    return;
  }

  for (const floraMesh of chunk.floraMeshes) {
    floraMesh.geometry.dispose();
    scene.remove(floraMesh);
  }
  chunk.floraMeshes.length = 0;
}

const FACE_AO_SAMPLES = [
  [[1, 1, 0], [1, -1, 0], [1, 0, 1], [1, 0, -1], [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1]],
  [[-1, 1, 0], [-1, -1, 0], [-1, 0, 1], [-1, 0, -1], [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1]],
  [[1, 1, 0], [-1, 1, 0], [0, 1, 1], [0, 1, -1], [1, 1, 1], [1, 1, -1], [-1, 1, 1], [-1, 1, -1]],
  [[1, -1, 0], [-1, -1, 0], [0, -1, 1], [0, -1, -1], [1, -1, 1], [1, -1, -1], [-1, -1, 1], [-1, -1, -1]],
  [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1], [-1, 1, 1], [1, -1, 1], [-1, -1, 1]],
  [[1, 0, -1], [-1, 0, -1], [0, 1, -1], [0, -1, -1], [1, 1, -1], [-1, 1, -1], [1, -1, -1], [-1, -1, -1]],
];

function getMeshingNeighborBlock(chunk, lx, y, lz, worldX, worldZ, dx, dy, dz) {
  const nx = lx + dx;
  const ny = y + dy;
  const nz = lz + dz;
  if (
    nx >= 0 && nx < CHUNK_SIZE_X &&
    nz >= 0 && nz < CHUNK_SIZE_Z &&
    ny >= 0 && ny < WORLD_HEIGHT
  ) {
    return getLocalBlock(chunk.data, nx, ny, nz);
  }
  return getBlockAtWorld(worldX + dx, y + dy, worldZ + dz);
}

function getFaceAmbientFactor(chunk, lx, y, lz, worldX, worldZ, faceIndex) {
  const samples = FACE_AO_SAMPLES[faceIndex];
  let occlusion = 0;

  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i];
    const sampleType = getMeshingNeighborBlock(
      chunk,
      lx,
      y,
      lz,
      worldX,
      worldZ,
      sample[0],
      sample[1],
      sample[2]
    );
    if (!isOccludingBlock(sampleType)) continue;
    occlusion += i < 4 ? 1 : 0.62;
  }

  return THREE.MathUtils.clamp(1 - occlusion * 0.085, 0.58, 1.03);
}

function rebuildChunkMesh(chunk) {
  disposeChunkMesh(chunk);
  const previousFaceCount = chunk.faceCount;
  const previousSolidCount = chunk.solidCount;

  const positions = [];
  const normals = [];
  const colors = [];
  const waterPositions = [];
  const waterNormals = [];
  const waterColors = [];
  const floraBuffers = {};

  for (const floraType of FLORA_RENDER_TYPES) {
    floraBuffers[floraType] = {
      positions: [],
      normals: [],
      colors: [],
      uvs: [],
      quadCount: 0,
    };
  }

  let faceCount = 0;
  let solidCount = 0;

  for (let y = 0; y < WORLD_HEIGHT; y += 1) {
    for (let lx = 0; lx < CHUNK_SIZE_X; lx += 1) {
      for (let lz = 0; lz < CHUNK_SIZE_Z; lz += 1) {
        const type = getLocalBlock(chunk.data, lx, y, lz);
        if (type === BLOCK.AIR) continue;

        const worldX = chunk.cx * CHUNK_SIZE_X + lx;
        const worldZ = chunk.cz * CHUNK_SIZE_Z + lz;
        if (!isWaterBlock(type)) {
          solidCount += 1;
        }

        if (isWaterBlock(type)) {
          for (let faceIndex = 0; faceIndex < FACE_DEFS.length; faceIndex += 1) {
            const face = FACE_DEFS[faceIndex];
            if (face.dir[1] < 0) continue;

            const neighbor = getMeshingNeighborBlock(
              chunk,
              lx,
              y,
              lz,
              worldX,
              worldZ,
              face.dir[0],
              face.dir[1],
              face.dir[2]
            );
            if (isWaterBlock(neighbor) || isOccludingBlock(neighbor)) continue;

            faceCount += 1;
            const depthFactor = THREE.MathUtils.clamp((SEA_LEVEL + 8 - y) / 16, 0, 1);
            const shade = face.dir[1] === 1 ? 1.04 : 0.82;
            const r = THREE.MathUtils.clamp(
              lerp(WATER_BLOCK_SHALLOW_COLOR.r, WATER_BLOCK_DEEP_COLOR.r, depthFactor) * shade,
              0,
              1
            );
            const g = THREE.MathUtils.clamp(
              lerp(WATER_BLOCK_SHALLOW_COLOR.g, WATER_BLOCK_DEEP_COLOR.g, depthFactor) * shade,
              0,
              1
            );
            const b = THREE.MathUtils.clamp(
              lerp(WATER_BLOCK_SHALLOW_COLOR.b, WATER_BLOCK_DEEP_COLOR.b, depthFactor) * shade,
              0,
              1
            );

            for (const cornerIndex of TRIANGLE_ORDER) {
              const corner = face.corners[cornerIndex];
              waterPositions.push(lx + corner[0], y + corner[1], lz + corner[2]);
              waterNormals.push(face.dir[0], face.dir[1], face.dir[2]);
              waterColors.push(r, g, b);
            }
          }
          continue;
        }

        const baseColor = BLOCK_COLORS[type] ?? BLOCK_COLORS[BLOCK.STONE];
        const variation = blockVariation(worldX, y, worldZ);

        if (isFloraBlock(type)) {
          faceCount += addFloraBillboards(
            floraBuffers[type],
            type,
            lx,
            y,
            lz,
            worldX,
            worldZ,
            baseColor,
            variation
          );
          continue;
        }

        for (let faceIndex = 0; faceIndex < FACE_DEFS.length; faceIndex += 1) {
          const face = FACE_DEFS[faceIndex];
          const neighbor = getMeshingNeighborBlock(
            chunk,
            lx,
            y,
            lz,
            worldX,
            worldZ,
            face.dir[0],
            face.dir[1],
            face.dir[2]
          );
          if (isOccludingBlock(neighbor)) continue;

          faceCount += 1;
          const ambientFactor = getFaceAmbientFactor(chunk, lx, y, lz, worldX, worldZ, faceIndex);
          let light = face.dir[1] === 1 ? 1.0 : face.dir[1] === -1 ? 0.56 : 0.78;
          if (isLeafLikeBlock(type)) light += 0.04;
          light *= ambientFactor;

          const r = THREE.MathUtils.clamp(baseColor.r * variation * light, 0, 1);
          const g = THREE.MathUtils.clamp(baseColor.g * variation * light, 0, 1);
          const b = THREE.MathUtils.clamp(baseColor.b * variation * light, 0, 1);

          for (const cornerIndex of TRIANGLE_ORDER) {
            const corner = face.corners[cornerIndex];
            positions.push(lx + corner[0], y + corner[1], lz + corner[2]);
            normals.push(face.dir[0], face.dir[1], face.dir[2]);
            colors.push(r, g, b);
          }
        }
      }
    }
  }

  chunk.faceCount = faceCount;
  chunk.solidCount = solidCount;
  totalVisibleFaces += chunk.faceCount - previousFaceCount;
  totalSolidBlocks += chunk.solidCount - previousSolidCount;
  chunk.floraMeshes = [];

  if (positions.length > 0) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeBoundingSphere();

    const mesh = new THREE.Mesh(geometry, terrainMaterial);
    mesh.position.set(chunk.cx * CHUNK_SIZE_X, 0, chunk.cz * CHUNK_SIZE_Z);
    chunk.mesh = mesh;
    scene.add(mesh);
  } else {
    chunk.mesh = null;
  }

  if (waterPositions.length > 0) {
    const waterGeometry = new THREE.BufferGeometry();
    waterGeometry.setAttribute("position", new THREE.Float32BufferAttribute(waterPositions, 3));
    waterGeometry.setAttribute("normal", new THREE.Float32BufferAttribute(waterNormals, 3));
    waterGeometry.setAttribute("color", new THREE.Float32BufferAttribute(waterColors, 3));
    waterGeometry.computeBoundingSphere();

    const waterMesh = new THREE.Mesh(waterGeometry, chunkWaterMaterial);
    waterMesh.position.set(chunk.cx * CHUNK_SIZE_X, 0, chunk.cz * CHUNK_SIZE_Z);
    waterMesh.renderOrder = 2;
    chunk.waterMesh = waterMesh;
    scene.add(waterMesh);
  } else {
    chunk.waterMesh = null;
  }

  for (const floraType of FLORA_RENDER_TYPES) {
    const buffer = floraBuffers[floraType];
    if (buffer.positions.length === 0) continue;

    const floraGeometry = new THREE.BufferGeometry();
    floraGeometry.setAttribute("position", new THREE.Float32BufferAttribute(buffer.positions, 3));
    floraGeometry.setAttribute("normal", new THREE.Float32BufferAttribute(buffer.normals, 3));
    floraGeometry.setAttribute("color", new THREE.Float32BufferAttribute(buffer.colors, 3));
    floraGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(buffer.uvs, 2));
    floraGeometry.computeBoundingSphere();

    const floraMesh = new THREE.Mesh(floraGeometry, floraMaterials[floraType]);
    floraMesh.position.set(chunk.cx * CHUNK_SIZE_X, 0, chunk.cz * CHUNK_SIZE_Z);
    floraMesh.renderOrder = 1;
    chunk.floraMeshes.push(floraMesh);
    scene.add(floraMesh);
  }
}

function enqueueChunkMesh(cx, cz, highPriority = false) {
  const key = chunkKey(cx, cz);
  if (!activeChunks.has(key) || queuedMeshKeys.has(key)) return;
  queuedMeshKeys.add(key);
  if (highPriority) {
    chunkMeshQueue.unshift({ cx, cz, key });
  } else {
    chunkMeshQueue.push({ cx, cz, key });
  }
}

function dropQueuedMeshTask(key) {
  if (!queuedMeshKeys.has(key)) return;
  queuedMeshKeys.delete(key);
  for (let i = chunkMeshQueue.length - 1; i >= 0; i -= 1) {
    if (chunkMeshQueue[i].key === key) {
      chunkMeshQueue.splice(i, 1);
    }
  }
}

function loadChunk(cx, cz) {
  const key = chunkKey(cx, cz);
  if (activeChunks.has(key)) return;

  const generated = generateChunkData(cx, cz);
  const chunk = {
    cx,
    cz,
    data: generated.data,
    mesh: null,
    waterMesh: null,
    floraMeshes: [],
    faceCount: 0,
    solidCount: 0,
    treeCount: generated.treeCount,
    oreCount: generated.oreCount,
  };

  activeChunks.set(key, chunk);
  totalTrees += chunk.treeCount;
  totalOreBlocks += chunk.oreCount;
  enqueueChunkMesh(cx, cz, true);
}

function unloadChunk(key) {
  const chunk = activeChunks.get(key);
  if (!chunk) return;

  totalVisibleFaces -= chunk.faceCount;
  totalSolidBlocks -= chunk.solidCount;
  totalTrees -= chunk.treeCount;
  totalOreBlocks -= chunk.oreCount;

  disposeChunkMesh(chunk);
  dropQueuedMeshTask(key);
  activeChunks.delete(key);

  // Neighbor meshes need to be rebuilt when a chunk disappears so boundary faces become visible.
  for (const [dx, dz] of NEIGHBOR_OFFSETS_2D) {
    const neighbor = activeChunks.get(chunkKey(chunk.cx + dx, chunk.cz + dz));
    if (neighbor) enqueueChunkMesh(neighbor.cx, neighbor.cz, true);
  }
}

function clearChunks() {
  for (const chunk of activeChunks.values()) {
    disposeChunkMesh(chunk);
  }
  activeChunks.clear();
  chunkLoadQueue.length = 0;
  chunkMeshQueue.length = 0;
  queuedChunkKeys.clear();
  queuedMeshKeys.clear();
  totalVisibleFaces = 0;
  totalSolidBlocks = 0;
  totalTrees = 0;
  totalOreBlocks = 0;
}

function enqueueChunk(cx, cz, distanceSq) {
  const key = chunkKey(cx, cz);
  if (activeChunks.has(key) || queuedChunkKeys.has(key)) return;

  queuedChunkKeys.add(key);
  chunkLoadQueue.push({ cx, cz, distanceSq, key });
}

function refreshChunkTargets(centerCx, centerCz) {
  const keepSet = new Set();
  const unloadRadiusSq = UNLOAD_RADIUS * UNLOAD_RADIUS;
  const loadRadiusSq = LOAD_RADIUS * LOAD_RADIUS;

  for (let dz = -UNLOAD_RADIUS; dz <= UNLOAD_RADIUS; dz += 1) {
    for (let dx = -UNLOAD_RADIUS; dx <= UNLOAD_RADIUS; dx += 1) {
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq > unloadRadiusSq) continue;

      const cx = centerCx + dx;
      const cz = centerCz + dz;
      const key = chunkKey(cx, cz);
      keepSet.add(key);

      if (distanceSq <= loadRadiusSq) {
        enqueueChunk(cx, cz, distanceSq);
      }
    }
  }

  for (const key of activeChunks.keys()) {
    if (!keepSet.has(key)) unloadChunk(key);
  }

  for (let i = chunkLoadQueue.length - 1; i >= 0; i -= 1) {
    const item = chunkLoadQueue[i];
    const dx = item.cx - centerCx;
    const dz = item.cz - centerCz;
    const distanceSq = dx * dx + dz * dz;
    if (distanceSq > unloadRadiusSq) {
      queuedChunkKeys.delete(item.key);
      chunkLoadQueue.splice(i, 1);
    } else {
      item.distanceSq = distanceSq;
    }
  }

  chunkLoadQueue.sort((a, b) => a.distanceSq - b.distanceSq);
}

function processChunkQueue(
  centerCx,
  centerCz,
  maxLoads = MAX_CHUNK_LOADS_PER_FRAME,
  budgetMs = CHUNK_LOAD_BUDGET_MS
) {
  let loaded = 0;
  const unloadRadiusSq = UNLOAD_RADIUS * UNLOAD_RADIUS;
  const startedAt = performance.now();

  while (loaded < maxLoads && chunkLoadQueue.length > 0) {
    if (loaded > 0 && performance.now() - startedAt >= budgetMs) break;

    const next = chunkLoadQueue.shift();
    queuedChunkKeys.delete(next.key);

    const dx = next.cx - centerCx;
    const dz = next.cz - centerCz;
    if (dx * dx + dz * dz > unloadRadiusSq) continue;

    if (!activeChunks.has(next.key)) {
      loadChunk(next.cx, next.cz);
      loaded += 1;
    }
  }
}

function processChunkMeshQueue(
  maxMeshes = MAX_CHUNK_MESHES_PER_FRAME,
  budgetMs = CHUNK_MESH_BUDGET_MS
) {
  let meshed = 0;
  const startedAt = performance.now();

  while (meshed < maxMeshes && chunkMeshQueue.length > 0) {
    if (meshed > 0 && performance.now() - startedAt >= budgetMs) break;

    const next = chunkMeshQueue.shift();
    queuedMeshKeys.delete(next.key);

    const chunk = activeChunks.get(next.key);
    if (!chunk) continue;
    rebuildChunkMesh(chunk);
    meshed += 1;
  }
}

function buildWater() {
  if (waterMesh) {
    waterMesh.geometry.dispose();
    waterMesh.material.dispose();
    scene.remove(waterMesh);
    waterMesh = null;
    waterUniforms = null;
  }

  const geometry = new THREE.PlaneGeometry(
    WATER_PLANE_SIZE,
    WATER_PLANE_SIZE,
    WATER_GRID_SEGMENTS,
    WATER_GRID_SEGMENTS
  );
  waterUniforms = {
    uTime: { value: 0 },
    uDaylight: { value: 1 },
    uDeepColor: { value: new THREE.Color(0x13345f) },
    uShallowColor: { value: new THREE.Color(0x62a8df) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms: waterUniforms,
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying float vWave;
      #include <fog_pars_vertex>

      float waveHeight(vec2 p, float t) {
        float wave = sin((p.x + t * 5.8) * 0.035) * 0.11;
        wave += cos((p.y - t * 4.2) * 0.041) * 0.08;
        wave += sin((p.x + p.y + t * 2.4) * 0.028) * 0.06;
        return wave;
      }

      void main() {
        vec3 localPos = position;
        float wave = waveHeight(localPos.xy, uTime);
        localPos.z += wave;

        float eps = 0.3;
        float waveDx = waveHeight(localPos.xy + vec2(eps, 0.0), uTime);
        float waveDy = waveHeight(localPos.xy + vec2(0.0, eps), uTime);
        vec3 tangentX = normalize(vec3(eps, 0.0, waveDx - wave));
        vec3 tangentY = normalize(vec3(0.0, eps, waveDy - wave));
        vec3 localNormal = normalize(cross(tangentY, tangentX));

        vec4 worldPos = modelMatrix * vec4(localPos, 1.0);
        vWorldPos = worldPos.xyz;
        vWorldNormal = normalize(normalMatrix * localNormal);
        vWave = wave;

        vec4 mvPosition = viewMatrix * worldPos;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform float uDaylight;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying float vWave;
      #include <fog_pars_fragment>

      void main() {
        vec3 normalDir = normalize(vWorldNormal);
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - clamp(dot(viewDir, normalDir), 0.0, 1.0), 2.6);
        float ripple = 0.5 + vWave * 1.7;

        vec3 deep = mix(uDeepColor * 0.45, uDeepColor, uDaylight);
        vec3 shallow = mix(uShallowColor * 0.42, uShallowColor, uDaylight);
        vec3 color = mix(deep, shallow, clamp(0.22 + fresnel * 0.92 + ripple * 0.06, 0.0, 1.0));
        float alpha = clamp(mix(0.2, 0.34, uDaylight) + fresnel * 0.18, 0.16, 0.62);

        gl_FragColor = vec4(color, alpha);
        #include <fog_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });

  waterMesh = new THREE.Mesh(geometry, material);
  waterMesh.rotation.x = -Math.PI * 0.5;
  waterMesh.position.y = SEA_LEVEL + 0.36;
  scene.add(waterMesh);
}

function updateWaterPosition() {
  if (!waterMesh) return;

  const snapX = worldToChunkCoord(camera.position.x, CHUNK_SIZE_X) * CHUNK_SIZE_X + CHUNK_SIZE_X * 0.5;
  const snapZ = worldToChunkCoord(camera.position.z, CHUNK_SIZE_Z) * CHUNK_SIZE_Z + CHUNK_SIZE_Z * 0.5;
  waterMesh.position.x = snapX;
  waterMesh.position.z = snapZ;
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function setText(target, value) {
  if (target) target.textContent = value;
}

function getDaylightLabel(daylight) {
  if (daylight >= 0.84) return "Day";
  if (daylight >= 0.62) return "Afternoon";
  if (daylight >= 0.44) return "Dusk";
  if (daylight >= 0.26) return "Night";
  if (daylight >= 0.12) return "Midnight";
  return "Pre-dawn";
}

function updateHealthUi() {
  const ratio = THREE.MathUtils.clamp(playerHealth / PLAYER_MAX_HEALTH, 0, 1);
  const percent = Math.round(ratio * 100);
  let stateLabel = "Stable";
  let state = "stable";
  if (ratio <= 0.15) {
    stateLabel = "Critical";
    state = "critical";
  } else if (ratio <= 0.3) {
    stateLabel = "Danger";
    state = "danger";
  } else if (ratio <= 0.55) {
    stateLabel = "Injured";
    state = "injured";
  }

  if (healthFill) {
    healthFill.style.width = `${(ratio * 100).toFixed(1)}%`;
    const red = Math.round(220 - ratio * 90);
    const green = Math.round(58 + ratio * 130);
    const blue = Math.round(82 + ratio * 32);
    healthFill.style.background = `linear-gradient(90deg, rgb(${red}, ${green}, ${blue}), rgb(${red + 18}, ${green + 20}, ${blue + 8}))`;
  }
  if (healthValue) {
    healthValue.textContent = `${Math.ceil(playerHealth)} / ${PLAYER_MAX_HEALTH}`;
  }
  setText(healthState, stateLabel);
  setText(healthPercent, `${percent}%`);
  if (healthUi) {
    healthUi.classList.toggle("critical", ratio <= 0.3);
    healthUi.dataset.state = state;
  }
}

function hideDeathScreen() {
  if (deathScreen) {
    deathScreen.classList.add("hidden");
    deathScreen.setAttribute("aria-hidden", "true");
  }
}

function showDeathScreen() {
  const elapsedSeconds = (performance.now() - runStartTimeMs) / 1000;
  const accuracy = shotsFired > 0 ? (shotsHit / shotsFired) * 100 : 0;
  if (deathSummary) {
    deathSummary.textContent = `You survived for ${formatDuration(elapsedSeconds)} before being overrun.`;
  }
  if (deathStats) {
    deathStats.innerHTML =
      `<div class="death-stat"><span>Kills</span><strong>${zombieKills.toLocaleString()}</strong></div>` +
      `<div class="death-stat"><span>Shots Fired</span><strong>${shotsFired.toLocaleString()}</strong></div>` +
      `<div class="death-stat"><span>Accuracy</span><strong>${accuracy.toFixed(1)}%</strong></div>` +
      `<div class="death-stat"><span>Damage Taken</span><strong>${Math.round(playerDamageTaken)}</strong></div>` +
      `<div class="death-stat"><span>Distance</span><strong>${playerDistanceTraveled.toFixed(1)}m</strong></div>` +
      `<div class="death-stat"><span>Seed</span><strong>${worldSeed}</strong></div>`;
  }
  if (deathScreen) {
    deathScreen.classList.remove("hidden");
    deathScreen.setAttribute("aria-hidden", "false");
  }
}

function triggerPlayerDeath() {
  if (playerDead) return;
  playerDead = true;
  playerHealth = 0;
  firingHeld = false;
  playerDamageCooldown = 0;
  updateHealthUi();
  pressedKeys.clear();
  jumpHeldLastFrame = false;
  showDeathScreen();
  updateHud();
  if (controls.isLocked) controls.unlock();
}

function damagePlayer(amount) {
  if (playerDead || amount <= 0) return;
  if (playerDamageCooldown > 0) return;

  const appliedDamage = Math.min(playerHealth, amount);
  playerHealth = Math.max(0, playerHealth - amount);
  playerDamageTaken += appliedDamage;
  playerDamageCooldown = PLAYER_DAMAGE_COOLDOWN;
  playerDamageFlash = Math.min(1, playerDamageFlash + 0.95);
  updateHealthUi();
  updateHud();

  if (playerHealth <= 0) {
    triggerPlayerDeath();
  }
}

function updatePlayerCombatState(delta) {
  playerDamageCooldown = Math.max(0, playerDamageCooldown - delta);
  const decay = playerDead ? 0.42 : 2.4;
  playerDamageFlash = Math.max(0, playerDamageFlash - delta * decay);
  if (damageVignette) {
    const base = playerDead ? 0.42 : 0.0;
    const flash = playerDead ? 0.26 + playerDamageFlash * 0.36 : playerDamageFlash * 0.5;
    damageVignette.style.opacity = (base + flash).toFixed(3);
  }

  if (!playerDead && controls.isLocked) {
    playerDistanceTraveled += camera.position.distanceTo(lastPlayerPos);
  }
  lastPlayerPos.copy(camera.position);
}

function updateHud() {
  const lockState = playerDead ? "Eliminated" : controls.isLocked ? "Engaged" : "Click to play";
  const statusText = hudErrorMessage || lockState;
  const statusState = hudErrorMessage
    ? "error"
    : playerDead
      ? "down"
      : controls.isLocked
        ? "active"
        : "idle";

  const sampleX = Math.floor(camera.position.x);
  const sampleZ = Math.floor(camera.position.z);
  const sampleY = Math.floor(camera.position.y);
  const riverIntensity = getRiverIntensity(sampleX, sampleZ);
  const biomeName = BIOME_NAMES[getBiomeAt(sampleX, sampleZ, riverIntensity)] ?? "Plains";
  const cx = worldToChunkCoord(camera.position.x, CHUNK_SIZE_X);
  const cz = worldToChunkCoord(camera.position.z, CHUNK_SIZE_Z);
  const accuracy = shotsFired > 0 ? (shotsHit / shotsFired) * 100 : 0;
  const daylight = THREE.MathUtils.clamp((Math.sin(dayPhase) + 0.12) / 1.12, 0, 1);
  const daylightLabel = getDaylightLabel(daylight);

  setHudStatus(statusText, statusState);
  if (hud) hud.classList.toggle("error", Boolean(hudErrorMessage));

  setText(hudBiomeValue, biomeName);
  setText(hudSeedValue, String(worldSeed));
  setText(hudChunkValue, `${cx}, ${cz}`);
  setText(hudPositionValue, `${sampleX}, ${sampleY}, ${sampleZ}`);
  setText(hudLoadedValue, `${activeChunks.size.toLocaleString()} chunks`);
  setText(hudQueuesValue, `${chunkLoadQueue.length} gen / ${chunkMeshQueue.length} mesh`);
  setText(hudZombiesValue, zombies.length.toLocaleString());
  setText(hudKillsValue, zombieKills.toLocaleString());
  setText(hudShotsValue, shotsFired.toLocaleString());
  setText(hudAccuracyValue, `${accuracy.toFixed(1)}%`);
  setText(hudDistanceValue, `${playerDistanceTraveled.toFixed(1)} m`);
  setText(hudTimeValue, `${daylightLabel} ${(daylight * 100).toFixed(0)}%`);
  setText(hudBlocksValue, totalSolidBlocks.toLocaleString());
  setText(hudFacesValue, totalVisibleFaces.toLocaleString());
  setText(hudDecorValue, totalTrees.toLocaleString());
  setText(hudOresValue, totalOreBlocks.toLocaleString());

  if (
    !hudStatusValue &&
    !hudBiomeValue &&
    hud
  ) {
    hud.textContent =
      `${statusText} | Seed ${worldSeed} | Chunk ${cx},${cz} | Biome ${biomeName} | ` +
      `Loaded ${activeChunks.size} | GenQ ${chunkLoadQueue.length} | MeshQ ${chunkMeshQueue.length} | ` +
      `Zombies ${zombies.length} | Kills ${zombieKills} | Shots ${shotsFired} | Accuracy ${accuracy.toFixed(1)}% | ` +
      `Decor ${totalTrees.toLocaleString()} | Ores ${totalOreBlocks.toLocaleString()} | ` +
      `Blocks ${totalSolidBlocks.toLocaleString()} | Faces ${totalVisibleFaces.toLocaleString()}`;
  }
}

function regenerate(useNewSeed = true, resetToSpawn = false) {
  if (useNewSeed) {
    worldSeed = randomSeed();
    createStarField();
    initializeCloudSeeds();
  }

  if (resetToSpawn) {
    camera.position.x = 0;
    camera.position.z = 0;
    camera.position.y = MAX_TERRAIN_HEIGHT + 18;
  }

  writeSeedToQuery(worldSeed);
  initializeNoiseOffsets();
  clearChunks();
  clearZombies();
  zombieSpawnTimer = 0.4;
  zombieKills = 0;
  shotsFired = 0;
  shotsHit = 0;
  gunShootCooldown = 0;
  gunMuzzleFlashTime = 0;
  gunRecoil = 0;
  firingHeld = false;
  clearCombatEffects();
  playerHealth = PLAYER_MAX_HEALTH;
  playerDead = false;
  playerDamageCooldown = 0;
  playerDamageFlash = 0;
  playerDistanceTraveled = 0;
  playerDamageTaken = 0;
  runStartTimeMs = performance.now();
  hideDeathScreen();
  updateHealthUi();

  cameraChunkX = worldToChunkCoord(camera.position.x, CHUNK_SIZE_X);
  cameraChunkZ = worldToChunkCoord(camera.position.z, CHUNK_SIZE_Z);

  refreshChunkTargets(cameraChunkX, cameraChunkZ);
  processChunkQueue(cameraChunkX, cameraChunkZ, 4, 14);
  processChunkMeshQueue(2, 14);
  while (collidesPlayerAt(camera.position.x, camera.position.y, camera.position.z)) {
    camera.position.y += 0.5;
    if (camera.position.y > WORLD_HEIGHT + 120) break;
  }
  playerVelocityY = 0;
  playerGrounded = false;
  lastPlayerPos.copy(camera.position);
  updateHud();
}

function fillPlayerBounds(eyeX, eyeY, eyeZ, target = playerBoundsScratch) {
  const footY = eyeY - PLAYER_EYE_HEIGHT;
  target.minX = eyeX - PLAYER_RADIUS;
  target.maxX = eyeX + PLAYER_RADIUS;
  target.minY = footY;
  target.maxY = footY + PLAYER_HEIGHT;
  target.minZ = eyeZ - PLAYER_RADIUS;
  target.maxZ = eyeZ + PLAYER_RADIUS;
  return target;
}

function collidesPlayerAt(eyeX, eyeY, eyeZ) {
  const bounds = fillPlayerBounds(eyeX, eyeY, eyeZ);
  const minX = Math.floor(bounds.minX);
  const maxX = Math.floor(bounds.maxX);
  const minY = Math.floor(bounds.minY);
  const maxY = Math.floor(bounds.maxY);
  const minZ = Math.floor(bounds.minZ);
  const maxZ = Math.floor(bounds.maxZ);

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        const type = getBlockAtWorld(x, y, z);
        if (!isOccludingBlock(type)) continue;
        if (bounds.maxX <= x || bounds.minX >= x + 1) continue;
        if (bounds.maxY <= y || bounds.minY >= y + 1) continue;
        if (bounds.maxZ <= z || bounds.minZ >= z + 1) continue;
        return true;
      }
    }
  }

  return false;
}

function collidesZombieAt(worldX, footY, worldZ) {
  const minX = Math.floor(worldX - ZOMBIE_RADIUS);
  const maxX = Math.floor(worldX + ZOMBIE_RADIUS);
  const minY = Math.floor(footY);
  const maxY = Math.floor(footY + ZOMBIE_HEIGHT);
  const minZ = Math.floor(worldZ - ZOMBIE_RADIUS);
  const maxZ = Math.floor(worldZ + ZOMBIE_RADIUS);

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        const type = getBlockAtWorld(x, y, z);
        if (!isOccludingBlock(type)) continue;
        if (worldX + ZOMBIE_RADIUS <= x || worldX - ZOMBIE_RADIUS >= x + 1) continue;
        if (footY + ZOMBIE_HEIGHT <= y || footY >= y + 1) continue;
        if (worldZ + ZOMBIE_RADIUS <= z || worldZ - ZOMBIE_RADIUS >= z + 1) continue;
        return true;
      }
    }
  }

  return false;
}

function sampleGroundTopY(worldX, worldZ, startY = WORLD_HEIGHT - 1, ignoreLeaves = false) {
  const x = Math.floor(worldX);
  const z = Math.floor(worldZ);
  const maxStart = THREE.MathUtils.clamp(Math.floor(startY), 0, WORLD_HEIGHT - 1);
  for (let y = maxStart; y >= 0; y -= 1) {
    const type = getBlockAtWorld(x, y, z);
    if (!isOccludingBlock(type)) continue;
    if (ignoreLeaves && isLeafLikeBlock(type)) continue;
    return y;
  }
  return -1;
}

function moveZombieAxisWithStep(zombie, axis, amount) {
  if (Math.abs(amount) < 1e-5) return false;

  const pos = zombie.group.position;
  const nextX = axis === "x" ? pos.x + amount : pos.x;
  const nextZ = axis === "z" ? pos.z + amount : pos.z;
  if (!collidesZombieAt(nextX, pos.y, nextZ)) {
    pos.x = nextX;
    pos.z = nextZ;
    return false;
  }

  if (!zombie.grounded || zombie.velocityY > 0.1) return true;

  const stepY = pos.y + ZOMBIE_STEP_HEIGHT;
  if (
    !collidesZombieAt(pos.x, stepY, pos.z) &&
    !collidesZombieAt(nextX, stepY, nextZ)
  ) {
    pos.y = stepY;
    pos.x = nextX;
    pos.z = nextZ;
    zombie.grounded = false;
    return false;
  }

  return true;
}

function shouldZombieJump(zombie, dirX, dirZ) {
  if (!zombie.grounded || zombie.jumpCooldown > 0) return false;

  const dirLength = Math.hypot(dirX, dirZ);
  if (dirLength < 0.001) return false;

  const ndx = dirX / dirLength;
  const ndz = dirZ / dirLength;
  const pos = zombie.group.position;
  const probeDist = ZOMBIE_RADIUS + 0.38;
  const probeX = pos.x + ndx * probeDist;
  const probeZ = pos.z + ndz * probeDist;
  const probeBlockX = Math.floor(probeX);
  const probeBlockZ = Math.floor(probeZ);
  const footY = pos.y;

  const obstacleLow = isOccludingBlock(getBlockAtWorld(probeBlockX, Math.floor(footY + 0.25), probeBlockZ));
  const obstacleMid = isOccludingBlock(getBlockAtWorld(probeBlockX, Math.floor(footY + 0.98), probeBlockZ));
  if (!obstacleLow && !obstacleMid) return false;

  const headBlocked =
    isOccludingBlock(getBlockAtWorld(Math.floor(pos.x), Math.floor(footY + ZOMBIE_HEIGHT + 0.08), Math.floor(pos.z))) ||
    isOccludingBlock(getBlockAtWorld(probeBlockX, Math.floor(footY + ZOMBIE_HEIGHT + 0.12), probeBlockZ));
  if (headBlocked) return false;

  const landingTop = sampleGroundTopY(
    pos.x + ndx * 1.3,
    pos.z + ndz * 1.3,
    Math.floor(footY + ZOMBIE_HEIGHT + 2),
    true
  );
  if (landingTop < 0) return false;
  const landingDelta = landingTop + 1 - footY;
  return landingDelta < 2.2 && landingDelta > -1.6;
}

function applyZombieVerticalPhysics(zombie, delta) {
  const pos = zombie.group.position;

  zombie.velocityY = Math.max(
    zombie.velocityY - ZOMBIE_GRAVITY * delta,
    -ZOMBIE_TERMINAL_VELOCITY
  );

  const verticalMove = THREE.MathUtils.clamp(zombie.velocityY * delta, -2.4, 2.4);
  const steps = Math.max(1, Math.ceil(Math.abs(verticalMove) / 0.08));
  const stepMove = verticalMove / steps;
  zombie.grounded = false;

  for (let s = 0; s < steps; s += 1) {
    const nextY = pos.y + stepMove;
    if (collidesZombieAt(pos.x, nextY, pos.z)) {
      if (stepMove < 0) zombie.grounded = true;
      zombie.velocityY = 0;
      break;
    }
    pos.y = nextY;
  }

  if (!zombie.grounded) {
    const probeY = pos.y - 0.06;
    if (collidesZombieAt(pos.x, probeY, pos.z)) {
      zombie.grounded = true;
      if (zombie.velocityY < 0) zombie.velocityY = 0;
    }
  }

  if (zombie.grounded && zombie.velocityY <= 0.001) {
    const topY = sampleGroundTopY(pos.x, pos.z, Math.floor(pos.y + ZOMBIE_HEIGHT + 2), true);
    if (topY >= 0) {
      const targetY = topY + 1;
      const deltaY = targetY - pos.y;
      if (deltaY < 0 && deltaY > -0.34 && !collidesZombieAt(pos.x, targetY, pos.z)) {
        pos.y = targetY;
      }
    }
  }
}

function raycastTerrain(origin, direction, maxDistance, outPoint, outNormal) {
  const step = 0.32;
  terrainRayPrevScratch.copy(origin);

  for (let traveled = 0; traveled <= maxDistance; traveled += step) {
    terrainRayPointScratch.copy(direction).multiplyScalar(traveled).add(origin);
    const bx = Math.floor(terrainRayPointScratch.x);
    const by = Math.floor(terrainRayPointScratch.y);
    const bz = Math.floor(terrainRayPointScratch.z);
    const type = getBlockAtWorld(bx, by, bz);
    if (!isOccludingBlock(type)) {
      terrainRayPrevScratch.copy(terrainRayPointScratch);
      continue;
    }

    outPoint.copy(terrainRayPointScratch);
    outNormal.copy(terrainRayPrevScratch).sub(terrainRayPointScratch);
    if (outNormal.lengthSq() < 1e-6) {
      outNormal.copy(direction).multiplyScalar(-1);
    } else {
      outNormal.normalize();
    }
    return traveled;
  }

  return -1;
}

function startZombieDeath(zombie, shotDirection) {
  if (!zombie || zombie.removed || zombie.isDying) return;

  zombie.isDying = true;
  zombie.deathTimer = 0;
  zombie.deathDuration = ZOMBIE_RAGDOLL_DURATION + Math.random() * 0.9;
  zombie.attackTimer = 0;
  zombie.attackDidDamage = false;
  zombie.hitStagger = 0;
  zombie.ragdollVelocity
    .copy(shotDirection)
    .multiplyScalar(5.6 + Math.random() * 2.7);
  zombie.ragdollVelocity.y = 2.3 + Math.random() * 2.6;
  zombie.hitImpulse.copy(shotDirection).multiplyScalar(2.3 + Math.random() * 1.1);
  zombieKills += 1;
  zombie.hitMeshes.length = 0;

  for (const material of zombie.materials) {
    material.transparent = true;
    material.depthWrite = false;
    material.opacity = 1;
  }

  for (const part of zombie.ragdollParts) {
    const mesh = part.mesh;
    mesh.userData.zombie = undefined;
    scene.attach(mesh);

    part.velocity.copy(zombie.ragdollVelocity).multiplyScalar(0.58 + Math.random() * 0.5);
    part.velocity.x += (Math.random() * 2 - 1) * 2.2;
    part.velocity.y += Math.random() * 1.8;
    part.velocity.z += (Math.random() * 2 - 1) * 2.2;

    part.angularVelocity.set(
      (Math.random() * 2 - 1) * (2.8 + Math.random() * 4.2),
      (Math.random() * 2 - 1) * (2.8 + Math.random() * 4.2),
      (Math.random() * 2 - 1) * (2.8 + Math.random() * 4.2)
    );
  }

  scene.remove(zombie.group);
}

function applyDamageToZombie(zombie, damage, impactPoint, shotDirection) {
  if (!zombie || zombie.removed || zombie.isDying) return false;

  zombie.health -= damage;
  shotsHit += 1;
  zombie.hitFlash = 1;
  zombie.hitStagger = ZOMBIE_HIT_STAGGER_TIME;
  zombie.hitImpulse.copy(shotDirection).multiplyScalar(4.1 + Math.random() * 1.7);
  zombie.head.rotation.x = THREE.MathUtils.clamp(
    zombie.head.rotation.x + 0.08 + Math.random() * 0.12,
    -0.42,
    0.52
  );
  if (impactPoint) {
    zombie.head.rotation.y += (Math.random() * 2 - 1) * 0.08;
  }

  if (zombie.health <= 0) {
    startZombieDeath(zombie, shotDirection);
    return true;
  }

  return false;
}

function resolveProjectileImpact(projectile) {
  if (projectile.hitType === 1) {
    const zombie = projectile.targetZombie;
    if (zombie && !zombie.removed && !zombie.isDying) {
      applyDamageToZombie(zombie, projectile.damage, projectile.hitPoint, projectile.direction);
      impactNormalScratch.copy(projectile.direction).multiplyScalar(-1);
      spawnImpactBurst(projectile.hitPoint, impactNormalScratch, IMPACT_PARTICLES_HIT, true);
    }
    return;
  }

  if (projectile.hitType === 2) {
    spawnImpactBurst(projectile.hitPoint, projectile.hitNormal, IMPACT_PARTICLES_WORLD, false);
  }
}

function createZombie(worldX, footY, worldZ) {
  const zombie = {
    group: new THREE.Group(),
    health: ZOMBIE_HEALTH,
    speed: ZOMBIE_SPEED_MIN + Math.random() * (ZOMBIE_SPEED_MAX - ZOMBIE_SPEED_MIN),
    stepPhase: Math.random() * Math.PI * 2,
    attackTimer: 0,
    attackCooldown: Math.random() * ZOMBIE_ATTACK_COOLDOWN,
    attackDidDamage: false,
    hitFlash: 0,
    hitStagger: 0,
    velocityY: 0,
    grounded: true,
    jumpCooldown: 0,
    hitImpulse: new THREE.Vector3(),
    isDying: false,
    removed: false,
    deathTimer: 0,
    deathDuration: ZOMBIE_DEATH_DURATION,
    ragdollVelocity: new THREE.Vector3(),
    ragdollParts: [],
    materials: [],
    pelvis: null,
    torso: null,
    chest: null,
    head: null,
    jaw: null,
    leftForearm: null,
    rightForearm: null,
    leftShin: null,
    rightShin: null,
    headMaterial: null,
    leftArm: null,
    rightArm: null,
    leftLeg: null,
    rightLeg: null,
    hitMeshes: [],
  };

  zombie.group.position.set(worldX, footY, worldZ);

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x3f7a64,
    roughness: 0.82,
    metalness: 0.04,
  });
  zombie.headMaterial = new THREE.MeshStandardMaterial({
    color: 0x6ca786,
    roughness: 0.74,
    metalness: 0.03,
    emissive: 0x220f0f,
    emissiveIntensity: 0,
  });
  const clothMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a5178,
    roughness: 0.88,
    metalness: 0.03,
  });
  const limbMaterial = new THREE.MeshStandardMaterial({
    color: 0x58836c,
    roughness: 0.86,
    metalness: 0.02,
  });
  const detailMaterial = new THREE.MeshStandardMaterial({
    color: 0x2f2a28,
    roughness: 0.92,
    metalness: 0.08,
  });
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0xd6f5d3,
    emissive: 0x7eff8a,
    emissiveIntensity: 0.3,
    roughness: 0.25,
    metalness: 0,
  });
  zombie.materials = [bodyMaterial, zombie.headMaterial, clothMaterial, limbMaterial, detailMaterial, eyeMaterial];

  zombie.pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.28), clothMaterial);
  zombie.pelvis.position.set(0, 0.84, 0);
  zombie.group.add(zombie.pelvis);

  zombie.torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.58, 0.36), bodyMaterial);
  zombie.torso.position.set(0, 1.22, 0);
  zombie.group.add(zombie.torso);

  const spinePlate = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.44, 0.08), detailMaterial);
  spinePlate.position.set(0, 0.02, 0.22);
  zombie.torso.add(spinePlate);

  zombie.chest = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.3, 0.34), clothMaterial);
  zombie.chest.position.set(0, 0.95, 0);
  zombie.group.add(zombie.chest);

  const shoulderLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.16), limbMaterial);
  shoulderLeft.position.set(-0.34, 0.21, 0);
  zombie.torso.add(shoulderLeft);
  const shoulderRight = shoulderLeft.clone();
  shoulderRight.position.x = 0.34;
  zombie.torso.add(shoulderRight);

  zombie.head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), zombie.headMaterial);
  zombie.head.position.set(0, 1.72, 0);
  zombie.group.add(zombie.head);

  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.08), detailMaterial);
  brow.position.set(0, 0.08, -0.18);
  zombie.head.add(brow);
  const eyeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), eyeMaterial);
  eyeLeft.position.set(-0.11, 0.0, -0.2);
  zombie.head.add(eyeLeft);
  const eyeRight = eyeLeft.clone();
  eyeRight.position.x = 0.11;
  zombie.head.add(eyeRight);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.08), detailMaterial);
  nose.position.set(0, -0.03, -0.21);
  zombie.head.add(nose);
  zombie.jaw = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.24), detailMaterial);
  zombie.jaw.position.set(0, -0.2, -0.02);
  zombie.head.add(zombie.jaw);

  zombie.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.44, 0.22), clothMaterial);
  zombie.leftLeg.position.set(-0.14, 0.69, 0);
  zombie.group.add(zombie.leftLeg);
  zombie.leftShin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 0.2), clothMaterial);
  zombie.leftShin.position.set(0, -0.42, 0.01);
  zombie.leftLeg.add(zombie.leftShin);
  const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.34), detailMaterial);
  leftFoot.position.set(0, -0.23, 0.08);
  zombie.leftShin.add(leftFoot);

  zombie.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.44, 0.22), clothMaterial);
  zombie.rightLeg.position.set(0.14, 0.69, 0);
  zombie.group.add(zombie.rightLeg);
  zombie.rightShin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 0.2), clothMaterial);
  zombie.rightShin.position.set(0, -0.42, 0.01);
  zombie.rightLeg.add(zombie.rightShin);
  const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.34), detailMaterial);
  rightFoot.position.set(0, -0.23, 0.08);
  zombie.rightShin.add(rightFoot);

  zombie.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.38, 0.18), limbMaterial);
  zombie.leftArm.position.set(-0.4, 1.18, 0);
  zombie.group.add(zombie.leftArm);
  zombie.leftForearm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 0.16), limbMaterial);
  zombie.leftForearm.position.set(0, -0.34, 0.01);
  zombie.leftArm.add(zombie.leftForearm);
  const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.14), detailMaterial);
  leftHand.position.set(0, -0.22, 0.02);
  zombie.leftForearm.add(leftHand);

  zombie.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.38, 0.18), limbMaterial);
  zombie.rightArm.position.set(0.4, 1.18, 0);
  zombie.group.add(zombie.rightArm);
  zombie.rightForearm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 0.16), limbMaterial);
  zombie.rightForearm.position.set(0, -0.34, 0.01);
  zombie.rightArm.add(zombie.rightForearm);
  const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.14), detailMaterial);
  rightHand.position.set(0, -0.22, 0.02);
  zombie.rightForearm.add(rightHand);

  zombie.hitMeshes = [
    zombie.pelvis,
    zombie.torso,
    zombie.chest,
    zombie.head,
    zombie.jaw,
    zombie.leftArm,
    zombie.leftForearm,
    zombie.rightArm,
    zombie.rightForearm,
    zombie.leftLeg,
    zombie.leftShin,
    zombie.rightLeg,
    zombie.rightShin,
  ];
  for (const mesh of zombie.hitMeshes) {
    mesh.userData.zombie = zombie;
  }

  zombie.ragdollParts = [
    { mesh: zombie.pelvis, radiusY: 0.11, velocity: new THREE.Vector3(), angularVelocity: new THREE.Vector3(), drag: 2.9, spinDrag: 3.6 },
    { mesh: zombie.torso, radiusY: 0.29, velocity: new THREE.Vector3(), angularVelocity: new THREE.Vector3(), drag: 2.6, spinDrag: 3.2 },
    { mesh: zombie.chest, radiusY: 0.15, velocity: new THREE.Vector3(), angularVelocity: new THREE.Vector3(), drag: 2.9, spinDrag: 3.6 },
    { mesh: zombie.head, radiusY: 0.19, velocity: new THREE.Vector3(), angularVelocity: new THREE.Vector3(), drag: 2.4, spinDrag: 2.8 },
    { mesh: zombie.leftArm, radiusY: 0.19, velocity: new THREE.Vector3(), angularVelocity: new THREE.Vector3(), drag: 2.1, spinDrag: 2.7 },
    { mesh: zombie.rightArm, radiusY: 0.19, velocity: new THREE.Vector3(), angularVelocity: new THREE.Vector3(), drag: 2.1, spinDrag: 2.7 },
    { mesh: zombie.leftLeg, radiusY: 0.23, velocity: new THREE.Vector3(), angularVelocity: new THREE.Vector3(), drag: 2.1, spinDrag: 2.5 },
    { mesh: zombie.rightLeg, radiusY: 0.23, velocity: new THREE.Vector3(), angularVelocity: new THREE.Vector3(), drag: 2.1, spinDrag: 2.5 },
  ];

  scene.add(zombie.group);
  zombies.push(zombie);
}

function removeZombieAt(index) {
  const zombie = zombies[index];
  if (!zombie) return;
  zombie.removed = true;
  scene.remove(zombie.group);

  const disposedGeometries = new Set();
  if (zombie.ragdollParts.length > 0) {
    for (const part of zombie.ragdollParts) {
      scene.remove(part.mesh);
      part.mesh.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        if (disposedGeometries.has(node.geometry)) return;
        node.geometry.dispose();
        disposedGeometries.add(node.geometry);
      });
    }
  } else {
    zombie.group.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      if (disposedGeometries.has(node.geometry)) return;
      node.geometry.dispose();
      disposedGeometries.add(node.geometry);
    });
  }

  for (const material of zombie.materials) {
    material.dispose();
  }

  zombies.splice(index, 1);
}

function clearZombies() {
  for (let i = zombies.length - 1; i >= 0; i -= 1) {
    removeZombieAt(i);
  }
}

function trySpawnZombieNearPlayer() {
  const playerFootY = camera.position.y - PLAYER_EYE_HEIGHT;
  const maxRadiusSq = ZOMBIE_DESPAWN_RADIUS * ZOMBIE_DESPAWN_RADIUS;

  for (let attempt = 0; attempt < 36; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = ZOMBIE_SPAWN_MIN_RADIUS + Math.random() * (ZOMBIE_SPAWN_MAX_RADIUS - ZOMBIE_SPAWN_MIN_RADIUS);
    const x = camera.position.x + Math.cos(angle) * radius;
    const z = camera.position.z + Math.sin(angle) * radius;
    const dx = x - camera.position.x;
    const dz = z - camera.position.z;
    if (dx * dx + dz * dz > maxRadiusSq) continue;

    const cx = worldToChunkCoord(x, CHUNK_SIZE_X);
    const cz = worldToChunkCoord(z, CHUNK_SIZE_Z);
    if (!activeChunks.has(chunkKey(cx, cz))) continue;

    const topY = sampleGroundTopY(x, z, WORLD_HEIGHT - 1, true);
    if (topY < SEA_LEVEL + 1) continue;
    const footY = topY + 1;
    if (Math.abs(footY - playerFootY) > 11) continue;
    if (collidesZombieAt(x, footY, z)) continue;

    let tooClose = false;
    for (const zombie of zombies) {
      if (zombie.isDying) continue;
      const zx = zombie.group.position.x - x;
      const zz = zombie.group.position.z - z;
      if (zx * zx + zz * zz < 2.3 * 2.3) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    createZombie(x, footY, z);
    return true;
  }

  return false;
}

function updateZombies(delta, daylight) {
  const nightFactor = THREE.MathUtils.clamp(
    (ZOMBIE_ACTIVE_DAYLIGHT - daylight) / ZOMBIE_ACTIVE_DAYLIGHT,
    0,
    1
  );
  const activityFactor = 0.56 + nightFactor * 0.44;

  zombieSpawnTimer -= delta;
  if (!playerDead && zombieSpawnTimer <= 0 && zombies.length < ZOMBIE_MAX_COUNT) {
    const deficit = ZOMBIE_MAX_COUNT - zombies.length;
    const burstTarget = THREE.MathUtils.clamp(Math.ceil(deficit / 9), 1, 6);
    let spawned = 0;

    for (let attempt = 0; attempt < burstTarget && zombies.length < ZOMBIE_MAX_COUNT; attempt += 1) {
      if (trySpawnZombieNearPlayer()) spawned += 1;
    }

    if (spawned === 0) {
      zombieSpawnTimer = 0.3 + Math.random() * 0.24;
    } else {
      const spawnScale = 1.08 - nightFactor * 0.38;
      const burstFactor = Math.min(2.4, 0.9 + spawned * 0.45);
      zombieSpawnTimer = (ZOMBIE_SPAWN_INTERVAL * spawnScale * (0.6 + Math.random() * 0.5)) / burstFactor;
    }
  }

  const despawnDistanceSq = ZOMBIE_DESPAWN_RADIUS * ZOMBIE_DESPAWN_RADIUS;
  for (let i = zombies.length - 1; i >= 0; i -= 1) {
    const zombie = zombies[i];
    const pos = zombie.group.position;
    const dx = camera.position.x - pos.x;
    const dz = camera.position.z - pos.z;
    const distSq = dx * dx + dz * dz;
    if (distSq > despawnDistanceSq) {
      removeZombieAt(i);
      continue;
    }

    if (zombie.isDying) {
      zombie.deathTimer += delta;
      let settledParts = 0;

      for (const part of zombie.ragdollParts) {
        const partMesh = part.mesh;
        part.velocity.y -= ZOMBIE_RAGDOLL_GRAVITY * delta;
        part.velocity.multiplyScalar(Math.max(0, 1 - part.drag * delta));
        partMesh.position.addScaledVector(part.velocity, delta);

        const groundTop = sampleGroundTopY(
          partMesh.position.x,
          partMesh.position.z,
          Math.floor(partMesh.position.y + ZOMBIE_HEIGHT + 3),
          true
        );
        let grounded = false;
        if (groundTop >= 0) {
          const groundY = groundTop + 1 + part.radiusY;
          if (partMesh.position.y < groundY) {
            partMesh.position.y = groundY;
            grounded = true;
            if (part.velocity.y < 0) {
              part.velocity.y *= -ZOMBIE_RAGDOLL_BOUNCE;
            }
            part.velocity.x *= 0.56;
            part.velocity.z *= 0.56;
            if (Math.abs(part.velocity.y) < 0.35) part.velocity.y = 0;
          }
        }

        part.angularVelocity.multiplyScalar(Math.max(0, 1 - part.spinDrag * delta));
        partMesh.rotation.x += part.angularVelocity.x * delta;
        partMesh.rotation.y += part.angularVelocity.y * delta;
        partMesh.rotation.z += part.angularVelocity.z * delta;

        if (
          grounded &&
          part.velocity.lengthSq() < 0.03 &&
          part.angularVelocity.lengthSq() < 0.08
        ) {
          settledParts += 1;
        }
      }

      if (zombie.hitFlash > 0) {
        zombie.hitFlash = Math.max(0, zombie.hitFlash - delta * 4.9);
      }

      const fadeStart = Math.max(0.5, zombie.deathDuration - ZOMBIE_RAGDOLL_FADE_TIME);
      const alpha = zombie.deathTimer < fadeStart
        ? 1
        : THREE.MathUtils.clamp(
            1 - (zombie.deathTimer - fadeStart) / ZOMBIE_RAGDOLL_FADE_TIME,
            0,
            1
          );
      for (const material of zombie.materials) {
        material.opacity = alpha;
      }
      zombie.headMaterial.emissiveIntensity = zombie.hitFlash * alpha * 0.95;

      if (
        zombie.deathTimer >= zombie.deathDuration ||
        (settledParts === zombie.ragdollParts.length && zombie.deathTimer > 1.8)
      ) {
        removeZombieAt(i);
      }
      continue;
    }

    const dist = Math.max(0.0001, Math.sqrt(distSq));
    let staggerRatio = 0;
    if (zombie.hitStagger > 0) {
      staggerRatio = zombie.hitStagger / ZOMBIE_HIT_STAGGER_TIME;
      zombie.hitStagger = Math.max(0, zombie.hitStagger - delta);
    }
    zombie.jumpCooldown = Math.max(0, zombie.jumpCooldown - delta);
    zombie.attackCooldown = Math.max(0, zombie.attackCooldown - delta);
    if (zombie.attackTimer > 0) {
      zombie.attackTimer = Math.max(0, zombie.attackTimer - delta);
    }

    if (zombie.hitImpulse.lengthSq() > 0.0001) {
      zombie.hitImpulse.multiplyScalar(Math.max(0, 1 - delta * 8.8));
      const impulseX = zombie.hitImpulse.x * delta;
      if (!collidesZombieAt(pos.x + impulseX, pos.y, pos.z)) pos.x += impulseX;
      const impulseZ = zombie.hitImpulse.z * delta;
      if (!collidesZombieAt(pos.x, pos.y, pos.z + impulseZ)) pos.z += impulseZ;
    }

    const canAttackPlayer = !playerDead && controls.isLocked;
    const meleeRange = ZOMBIE_ATTACK_RANGE;
    const wantsMelee = canAttackPlayer && dist <= meleeRange * 1.08;
    if (wantsMelee && zombie.attackTimer <= 0 && zombie.attackCooldown <= 0) {
      zombie.attackTimer = ZOMBIE_ATTACK_TOTAL;
      zombie.attackDidDamage = false;
      zombie.attackCooldown = ZOMBIE_ATTACK_COOLDOWN * (0.84 + Math.random() * 0.38);
    }
    if (canAttackPlayer && zombie.attackTimer > 0 && !zombie.attackDidDamage) {
      const attackProgress = 1 - zombie.attackTimer / ZOMBIE_ATTACK_TOTAL;
      const strikePoint = ZOMBIE_ATTACK_WINDUP / ZOMBIE_ATTACK_TOTAL;
      if (attackProgress >= strikePoint) {
        zombie.attackDidDamage = true;
        const hitDx = camera.position.x - pos.x;
        const hitDz = camera.position.z - pos.z;
        const hitDist = Math.hypot(hitDx, hitDz);
        if (hitDist <= meleeRange + ZOMBIE_ATTACK_REACH_BUFFER) {
          damagePlayer(ZOMBIE_ATTACK_DAMAGE);
          if (!playerDead && hitDist > 0.0001) {
            const knockback = 0.13 + Math.random() * 0.09;
            movePlayerHorizontal((hitDx / hitDist) * knockback, (hitDz / hitDist) * knockback);
            playerVelocityY = Math.max(playerVelocityY, 1.05);
          }
        }
      }
    }
    if (zombie.attackTimer <= 0) {
      zombie.attackDidDamage = false;
    }

    const speedFactor = Math.max(0, activityFactor * (1 - staggerRatio * 0.8));
    let moveX = 0;
    let moveZ = 0;
    if (dist > 1.2 && speedFactor > 0.02) {
      zombieToPlayerScratch.set(dx / dist, 0, dz / dist);
      const chaseScale = wantsMelee ? (zombie.attackTimer > 0 ? 0.08 : 0.24) : 1;
      zombieMoveScratch
        .copy(zombieToPlayerScratch)
        .multiplyScalar(zombie.speed * speedFactor * chaseScale * delta);
      moveX = zombieMoveScratch.x;
      moveZ = zombieMoveScratch.z;

      const blockedX = moveZombieAxisWithStep(zombie, "x", moveX);
      const blockedZ = moveZombieAxisWithStep(zombie, "z", moveZ);
      if ((blockedX || blockedZ) && !wantsMelee && shouldZombieJump(zombie, moveX, moveZ)) {
        zombie.velocityY = ZOMBIE_JUMP_VELOCITY * (0.92 + Math.random() * 0.2);
        zombie.grounded = false;
        zombie.jumpCooldown = ZOMBIE_JUMP_COOLDOWN * (0.85 + Math.random() * 0.35);
        zombie.stepPhase += 0.34;
      }
    }

    applyZombieVerticalPhysics(zombie, delta);

    if (dist > 0.001) {
      const targetYaw = Math.atan2(dx, dz);
      const wobble = Math.sin(zombie.stepPhase * 10.5) * staggerRatio * 0.16;
      zombie.group.rotation.y = THREE.MathUtils.lerp(
        zombie.group.rotation.y,
        targetYaw + wobble,
        Math.min(1, delta * 9)
      );
      zombie.group.rotation.z = THREE.MathUtils.lerp(
        zombie.group.rotation.z,
        wobble * 0.42,
        Math.min(1, delta * 12)
      );
    }

    const stride = THREE.MathUtils.clamp(speedFactor * (dist > 1.4 ? 1 : 0.25), 0.12, 1);
    const inAirBlend = zombie.grounded ? 0 : THREE.MathUtils.clamp(0.26 + Math.abs(zombie.velocityY) * 0.09, 0, 1);
    zombie.stepPhase += delta * (2.4 + zombie.speed * 2.8 * stride + staggerRatio * 3.4 + inAirBlend * 2.1);

    let attackSwing = 0;
    let attackBlend = 0;
    if (zombie.attackTimer > 0) {
      const attackProgress = 1 - zombie.attackTimer / ZOMBIE_ATTACK_TOTAL;
      const windupPoint = ZOMBIE_ATTACK_WINDUP / ZOMBIE_ATTACK_TOTAL;
      if (attackProgress <= windupPoint) {
        attackSwing = attackProgress / Math.max(0.0001, windupPoint);
      } else {
        attackSwing = 1 - (attackProgress - windupPoint) / Math.max(0.0001, 1 - windupPoint);
      }
      attackSwing = THREE.MathUtils.clamp(attackSwing, 0, 1);
      attackBlend = Math.sin(attackSwing * Math.PI);
    }

    const walkLeg = Math.sin(zombie.stepPhase) * (0.52 + staggerRatio * 0.2) * stride;
    const walkArm = -walkLeg * 0.9;
    const jumpLeg = 0.26 - THREE.MathUtils.clamp(zombie.velocityY * 0.075, -0.38, 0.38);
    const jumpArm = -0.44 - THREE.MathUtils.clamp(zombie.velocityY * 0.06, -0.34, 0.34);
    const legSwing = THREE.MathUtils.lerp(walkLeg, jumpLeg, inAirBlend);
    const armSwing = THREE.MathUtils.lerp(walkArm, jumpArm, inAirBlend);

    let leftArmX = armSwing;
    let rightArmX = -armSwing;
    let leftForearmX = -armSwing * 0.64 - inAirBlend * 0.24;
    let rightForearmX = armSwing * 0.64 - inAirBlend * 0.24;
    if (attackBlend > 0) {
      const rightAttackX = -1.42 + attackSwing * 2.32;
      const leftAttackX = -0.88 + attackSwing * 1.42;
      leftArmX = THREE.MathUtils.lerp(leftArmX, leftAttackX, 0.78);
      rightArmX = THREE.MathUtils.lerp(rightArmX, rightAttackX, 0.9);
      leftForearmX = THREE.MathUtils.lerp(leftForearmX, -0.36 + attackSwing * 1.12, 0.86);
      rightForearmX = THREE.MathUtils.lerp(rightForearmX, -0.72 + attackSwing * 1.58, 0.92);
    }

    zombie.leftLeg.rotation.x = legSwing;
    zombie.rightLeg.rotation.x = -legSwing;
    zombie.leftArm.rotation.x = leftArmX;
    zombie.rightArm.rotation.x = rightArmX;
    if (zombie.leftShin && zombie.rightShin) {
      zombie.leftShin.rotation.x = -legSwing * 0.52 + inAirBlend * 0.14;
      zombie.rightShin.rotation.x = legSwing * 0.52 + inAirBlend * 0.14;
    }
    if (zombie.leftForearm && zombie.rightForearm) {
      zombie.leftForearm.rotation.x = leftForearmX;
      zombie.rightForearm.rotation.x = rightForearmX;
    }
    if (zombie.torso) zombie.torso.rotation.x = attackBlend * 0.12;
    if (zombie.chest) zombie.chest.rotation.x = attackBlend * 0.18;
    zombie.group.rotation.x = THREE.MathUtils.lerp(
      zombie.group.rotation.x,
      attackBlend * 0.2 + inAirBlend * 0.06,
      Math.min(1, delta * 10)
    );
    if (zombie.jaw) {
      zombie.jaw.rotation.x =
        Math.sin(zombie.stepPhase * 0.82) * 0.08 +
        inAirBlend * 0.05 +
        zombie.hitFlash * 0.07 +
        attackBlend * 0.18;
    }
    zombie.head.rotation.y =
      Math.sin(zombie.stepPhase * 0.34) * 0.12 +
      Math.sin(zombie.stepPhase * 6.8) * staggerRatio * 0.08 -
      attackBlend * 0.08;
    zombie.head.rotation.x = THREE.MathUtils.lerp(
      zombie.head.rotation.x,
      inAirBlend * 0.06 + Math.sin(zombie.stepPhase * 0.24) * 0.04 + zombie.hitFlash * 0.08 + attackBlend * 0.14,
      Math.min(1, delta * 9)
    );

    if (zombie.hitFlash > 0) {
      zombie.hitFlash = Math.max(0, zombie.hitFlash - delta * 5.4);
    }
    zombie.headMaterial.emissiveIntensity = zombie.hitFlash * 0.95;
  }
}

function shootGun() {
  if (playerDead) return;
  if (!controls.isLocked || !gunGroup) return;
  if (gunShootCooldown > 0) return;

  gunShootCooldown = GUN_FIRE_INTERVAL;
  gunMuzzleFlashTime = GUN_MUZZLE_FLASH_DURATION;
  gunRecoil = THREE.MathUtils.clamp(gunRecoil + GUN_RECOIL_KICK, 0, 1);
  shotsFired += 1;

  camera.updateMatrixWorld(true);
  gunGroup.updateWorldMatrix(true, false);
  gunMuzzleWorldScratch.copy(gunMuzzleLocal);
  gunGroup.localToWorld(gunMuzzleWorldScratch);

  shotRaycaster.setFromCamera(shotNdc, camera);
  shotRaycaster.far = GUN_RANGE;
  const targets = [];
  for (const zombie of zombies) {
    if (zombie.removed || zombie.isDying) continue;
    for (const hitMesh of zombie.hitMeshes) targets.push(hitMesh);
  }

  let zombieHit = null;
  let zombieHitDistance = Number.POSITIVE_INFINITY;
  if (targets.length > 0) {
    const hits = shotRaycaster.intersectObjects(targets, false);
    if (hits.length > 0) {
      zombieHit = hits[0].object.userData.zombie ?? null;
      zombieHitDistance = hits[0].distance;
      gunShotEndScratch.copy(hits[0].point);
    }
  }

  const terrainHitDistance = raycastTerrain(
    shotRaycaster.ray.origin,
    shotRaycaster.ray.direction,
    GUN_RANGE,
    terrainRayPointScratch,
    impactNormalScratch
  );

  let hitType = 0;
  let targetZombie = null;
  if (zombieHit && (terrainHitDistance < 0 || zombieHitDistance <= terrainHitDistance + 0.05)) {
    hitType = 1;
    targetZombie = zombieHit;
    gunShotDirScratch.copy(shotRaycaster.ray.direction).multiplyScalar(-1);
  } else if (terrainHitDistance >= 0) {
    hitType = 2;
    gunShotEndScratch.copy(terrainRayPointScratch);
    gunShotDirScratch.copy(impactNormalScratch);
  } else {
    gunShotEndScratch
      .copy(shotRaycaster.ray.direction)
      .multiplyScalar(GUN_RANGE)
      .add(shotRaycaster.ray.origin);
    gunShotDirScratch.copy(shotRaycaster.ray.direction).multiplyScalar(-1);
  }

  spawnProjectile(gunMuzzleWorldScratch, gunShotEndScratch, gunShotDirScratch, hitType, targetZombie);
}

function updateProjectiles(delta) {
  for (const projectile of activeProjectiles) {
    if (!projectile.active) continue;

    projectile.life += delta;
    projectile.traveled += PROJECTILE_SPEED * delta;
    const reachedTarget = projectile.traveled >= projectile.distance || projectile.life >= projectile.maxLife;
    const travel = reachedTarget ? projectile.distance : projectile.traveled;

    projectile.mesh.position.copy(projectile.start).addScaledVector(projectile.direction, travel);

    if (!reachedTarget) continue;

    if (!projectile.hitApplied) {
      projectile.hitApplied = true;
      resolveProjectileImpact(projectile);
    }

    projectile.active = false;
    projectile.targetZombie = null;
    projectile.mesh.visible = false;
  }
}

function updateImpactParticles(delta) {
  for (const particle of impactParticles) {
    if (!particle.active) continue;

    particle.life += delta;
    if (particle.life >= particle.maxLife) {
      particle.active = false;
      particle.mesh.visible = false;
      continue;
    }

    particle.velocity.y -= particle.gravity * delta;
    particle.velocity.multiplyScalar(Math.max(0, 1 - particle.drag * delta));
    particle.mesh.position.addScaledVector(particle.velocity, delta);

    particle.mesh.rotation.x += particle.spinX * delta;
    particle.mesh.rotation.y += particle.spinY * delta;
    particle.mesh.rotation.z += particle.spinZ * delta;

    const lifeT = 1 - particle.life / particle.maxLife;
    const scale = particle.baseScale * (0.28 + lifeT * 0.95);
    particle.mesh.scale.setScalar(scale);
  }
}

function movePlayerHorizontal(moveX, moveZ) {
  if (moveX !== 0) {
    const nextX = camera.position.x + moveX;
    if (!collidesPlayerAt(nextX, camera.position.y, camera.position.z)) {
      camera.position.x = nextX;
    }
  }

  if (moveZ !== 0) {
    const nextZ = camera.position.z + moveZ;
    if (!collidesPlayerAt(camera.position.x, camera.position.y, nextZ)) {
      camera.position.z = nextZ;
    }
  }
}

function applyVerticalPlayerPhysics(delta) {
  playerVelocityY = Math.max(playerVelocityY - PLAYER_GRAVITY * delta, -PLAYER_TERMINAL_VELOCITY);
  const verticalMove = THREE.MathUtils.clamp(playerVelocityY * delta, -4, 4);
  const steps = Math.max(1, Math.ceil(Math.abs(verticalMove) / PLAYER_COLLISION_STEP));
  const step = verticalMove / steps;
  playerGrounded = false;

  for (let i = 0; i < steps; i += 1) {
    const nextY = camera.position.y + step;
    if (collidesPlayerAt(camera.position.x, nextY, camera.position.z)) {
      if (step < 0) playerGrounded = true;
      playerVelocityY = 0;
      break;
    }
    camera.position.y = nextY;
  }

  if (!playerGrounded) {
    const groundProbeY = camera.position.y - PLAYER_GROUND_CHECK_EPSILON;
    if (collidesPlayerAt(camera.position.x, groundProbeY, camera.position.z)) {
      playerGrounded = true;
      if (playerVelocityY < 0) playerVelocityY = 0;
    }
  }

  if (camera.position.y <= 2) {
    camera.position.y = 2;
    if (playerVelocityY < 0) playerVelocityY = 0;
  }
}

function updateMovement(delta) {
  if (playerDead) return;
  if (!controls.isLocked) return;

  const forwardInput = (pressedKeys.has("KeyW") ? 1 : 0) - (pressedKeys.has("KeyS") ? 1 : 0);
  const strafeInput = (pressedKeys.has("KeyD") ? 1 : 0) - (pressedKeys.has("KeyA") ? 1 : 0);
  const sprinting = pressedKeys.has("ShiftLeft") || pressedKeys.has("ShiftRight");
  const wantsJump = pressedKeys.has("Space");

  if (wantsJump && !jumpHeldLastFrame && playerGrounded) {
    playerVelocityY = PLAYER_JUMP_VELOCITY;
    playerGrounded = false;
  }
  jumpHeldLastFrame = wantsJump;

  if (forwardInput !== 0 || strafeInput !== 0) {
    camera.getWorldDirection(moveForwardScratch);
    moveForwardScratch.y = 0;
    if (moveForwardScratch.lengthSq() < 1e-6) {
      moveForwardScratch.set(0, 0, -1);
    } else {
      moveForwardScratch.normalize();
    }

    moveRightScratch.crossVectors(moveForwardScratch, upAxis).normalize();
    moveIntentScratch
      .copy(moveForwardScratch)
      .multiplyScalar(forwardInput)
      .addScaledVector(moveRightScratch, strafeInput);

    if (moveIntentScratch.lengthSq() > 1e-6) {
      moveIntentScratch.normalize();
      const speed = PLAYER_WALK_SPEED * (sprinting ? PLAYER_SPRINT_MULTIPLIER : 1);
      moveIntentScratch.multiplyScalar(speed * delta);
      movePlayerHorizontal(moveIntentScratch.x, moveIntentScratch.z);
    }
  }

  applyVerticalPlayerPhysics(delta);
  camera.position.y = THREE.MathUtils.clamp(camera.position.y, 2, WORLD_HEIGHT + 40);
}

function updatePlayerTorch(delta, daylight) {
  if (!torchGroup || !torchLight) return;

  torchTime += delta;
  const targetVisibility = THREE.MathUtils.clamp(
    (TORCH_HIDE_DAYLIGHT - daylight) / (TORCH_HIDE_DAYLIGHT - TORCH_SHOW_DAYLIGHT),
    0,
    1
  );
  torchVisibility += (targetVisibility - torchVisibility) * Math.min(1, delta * 5.8);

  const visible = torchVisibility > 0.02;
  torchGroup.visible = visible;
  if (!visible) {
    torchLight.intensity = 0;
    if (torchGlow && torchGlow.material instanceof THREE.SpriteMaterial) {
      torchGlow.material.opacity = 0;
    }
    return;
  }

  const flicker =
    1 +
    Math.sin(torchTime * 17.2) * 0.085 +
    Math.sin(torchTime * 31.7 + 0.7) * 0.05 +
    Math.sin(torchTime * 59.1 + 1.9) * 0.03;
  const bob = Math.sin(torchTime * 6.8) * 0.008 + Math.sin(torchTime * 12.7) * 0.004;
  const sway = Math.sin(torchTime * 4.5) * 0.012;

  torchGroup.position.set(-0.34 - sway * 0.45, -0.36 + bob, -0.54 + Math.abs(sway) * 0.03);
  torchGroup.rotation.set(-0.28 + bob * 1.2, 0.58 - sway * 0.5, -0.24 - sway * 0.85);

  torchLight.intensity = (
    TORCH_BASE_INTENSITY + torchVisibility * (TORCH_MAX_INTENSITY - TORCH_BASE_INTENSITY)
  ) * flicker;
  torchLight.distance = TORCH_BASE_DISTANCE + torchVisibility * (TORCH_MAX_DISTANCE - TORCH_BASE_DISTANCE);
  torchLight.color.setRGB(1.0, 0.74 + flicker * 0.08, 0.4 + flicker * 0.05);

  if (torchFlame && torchFlame.material instanceof THREE.MeshStandardMaterial) {
    const flameScale = 0.84 + torchVisibility * 0.22 + (flicker - 1) * 0.18;
    torchFlame.scale.set(flameScale, flameScale * 1.06, flameScale);
    torchFlame.material.emissiveIntensity = 0.7 + torchVisibility * 1.25 + (flicker - 1) * 1.5;
  }

  if (torchGlow && torchGlow.material instanceof THREE.SpriteMaterial) {
    torchGlow.material.opacity = THREE.MathUtils.clamp(
      0.2 + torchVisibility * 0.62 + (flicker - 1) * 0.9,
      0,
      1
    );
    const glowScale = 0.2 + torchVisibility * 0.2 + (flicker - 1) * 0.1;
    torchGlow.scale.set(glowScale, glowScale, 1);
  }
}

function updatePlayerGun(delta) {
  if (!gunGroup) return;

  gunShootCooldown = Math.max(0, gunShootCooldown - delta);
  gunMuzzleFlashTime = Math.max(0, gunMuzzleFlashTime - delta);
  gunRecoil = Math.max(0, gunRecoil - delta * GUN_RECOIL_RETURN);
  if (!playerDead && controls.isLocked && firingHeld && gunShootCooldown <= 0) {
    shootGun();
  }

  const idleBob = controls.isLocked
    ? Math.sin(torchTime * 7.1) * 0.004 + Math.cos(torchTime * 4.3) * 0.003
    : 0;
  const flashPulse = gunMuzzleFlashTime <= 0 ? 0 : gunMuzzleFlashTime / GUN_MUZZLE_FLASH_DURATION;
  const recoilLift = gunRecoil * 0.026 + flashPulse * 0.005;
  const recoilPush = gunRecoil * 0.11 + flashPulse * 0.02;
  const sideJolt = flashPulse * 0.008;
  const deathDrop = playerDead ? 0.32 : 0;
  gunGroup.position.set(0.36 + sideJolt, -0.43 + idleBob + recoilLift - deathDrop, -0.58 + recoilPush + deathDrop * 0.22);
  gunGroup.rotation.set(
    -0.15 - gunRecoil * 0.24 - flashPulse * 0.08 + deathDrop * 0.7,
    -0.35 + idleBob * 1.4 + flashPulse * 0.04,
    0.06 + gunRecoil * 0.12 + flashPulse * 0.12 - deathDrop * 0.28
  );

  if (gunMuzzleFlash && gunMuzzleFlash.material instanceof THREE.SpriteMaterial) {
    if (gunMuzzleFlashTime <= 0) {
      gunMuzzleFlash.material.opacity = 0;
      gunMuzzleFlash.scale.set(0.01, 0.01, 1);
    } else {
      const flash = gunMuzzleFlashTime / GUN_MUZZLE_FLASH_DURATION;
      gunMuzzleFlash.material.opacity = flash * 0.95;
      const scale = 0.14 + flash * 0.22;
      gunMuzzleFlash.scale.set(scale, scale * 0.8, 1);
    }
  }

  if (gunLight) {
    const flash = gunMuzzleFlashTime <= 0 ? 0 : gunMuzzleFlashTime / GUN_MUZZLE_FLASH_DURATION;
    gunLight.intensity = flash * 2.6;
  }
}

function updateLighting(delta) {
  dayPhase = (dayPhase + (Math.PI * 2 * delta) / DAY_LENGTH_SECONDS) % (Math.PI * 2);
  const sunArc = Math.sin(dayPhase);
  const daylight = THREE.MathUtils.clamp((sunArc + 0.12) / 1.12, 0, 1);
  const duskDawn = 1 - Math.abs(daylight * 2 - 1);
  const nightStrength = THREE.MathUtils.clamp(1 - daylight, 0, 1);
  const moonGlow = Math.pow(nightStrength, 1.38);

  sun.position.set(Math.cos(dayPhase) * 92, 12 + sunArc * 78, Math.sin(dayPhase * 0.78) * 64);
  sun.color.copy(SUN_LIGHT_SUNSET).lerp(SUN_LIGHT_DAY, daylight);
  sun.intensity = 0.08 + daylight * 1.22;

  moon.position.copy(sun.position).multiplyScalar(-1);
  moon.color.copy(MOON_LIGHT_COLOR);
  moon.intensity = 0.06 + (1 - daylight) * 0.36;

  fillLight.intensity = 0.24 + daylight * 0.62;
  fillLight.color.copy(HEMI_SKY_NIGHT).lerp(HEMI_SKY_DAY, daylight);
  fillLight.groundColor.copy(HEMI_GROUND_NIGHT).lerp(HEMI_GROUND_DAY, daylight);
  moonBounceLight.intensity = moonGlow * 0.08 + duskDawn * 0.008;
  moonBounceLight.color.copy(MOON_BOUNCE_SKY);
  moonBounceLight.groundColor.copy(MOON_BOUNCE_GROUND);

  terrainMaterial.emissive.setRGB(0, 0, 0);
  for (const material of Object.values(floraMaterials)) {
    if (material && material.emissive instanceof THREE.Color) {
      material.emissive.setRGB(0, 0, 0);
    }
  }
  renderer.toneMappingExposure = 0.9 + daylight * 0.23 + duskDawn * 0.06;

  skyScratch.copy(NIGHT_SKY).lerp(SUNSET_SKY, duskDawn * 0.68).lerp(DAY_SKY, daylight);
  scene.background.copy(skyScratch);

  fogScratch.copy(NIGHT_FOG).lerp(DAY_FOG, daylight);
  scene.fog.color.copy(fogScratch);

  if (skyDome && skyUniforms) {
    skyDome.position.copy(camera.position);
    sunDirScratch.copy(sun.position).normalize();
    moonDirScratch.copy(moon.position).normalize();
    skyUniforms.sunDirection.value.copy(sunDirScratch);
    skyUniforms.moonDirection.value.copy(moonDirScratch);
    skyUniforms.nightStrength.value = nightStrength;
    skyUniforms.time.value += delta;
    skyUniforms.topColor.value.copy(SKY_TOP_NIGHT).lerp(SKY_TOP_SUNSET, duskDawn * 0.72).lerp(SKY_TOP_DAY, daylight);
    skyUniforms.horizonColor.value.copy(SKY_HORIZON_NIGHT).lerp(SKY_HORIZON_SUNSET, duskDawn * 0.78).lerp(SKY_HORIZON_DAY, daylight);
    skyUniforms.bottomColor.value.copy(SKY_BOTTOM_NIGHT).lerp(SKY_BOTTOM_SUNSET, duskDawn * 0.7).lerp(SKY_BOTTOM_DAY, daylight);
    skyUniforms.sunColor.value.copy(SKY_SUN_GLOW_SUNSET).lerp(SKY_SUN_GLOW_DAY, daylight);
    skyUniforms.sunGlowPower.value = 50 + (1 - daylight) * 42 - duskDawn * 16;
  }

  if (starField && starMaterial) {
    starField.position.copy(camera.position);
    starField.rotation.y += delta * 0.0046;
    starField.rotation.z = Math.sin(dayPhase * 0.23) * 0.045;
    const starVisibility = THREE.MathUtils.clamp(
      Math.pow(1 - daylight, 1.12) * (0.76 + nightStrength * 0.42),
      0,
      1
    );
    const twinkle = 0.93 + Math.sin(dayPhase * 4.2) * 0.07 + Math.sin(dayPhase * 13.8) * 0.05;
    starMaterial.uniforms.uOpacity.value = starVisibility * twinkle;
    starMaterial.uniforms.uTime.value += delta;
  }

  if (sunSprite && sunSprite.material instanceof THREE.SpriteMaterial) {
    sunDirScratch.copy(sun.position).normalize();
    sunSprite.position.copy(camera.position).addScaledVector(sunDirScratch, SKY_DOME_RADIUS * 0.82);
    sunSprite.material.opacity = THREE.MathUtils.clamp(daylight * 1.2 + duskDawn * 0.25, 0, 1);
    sunSprite.scale.setScalar(34 + daylight * 30 + duskDawn * 8);
  }

  if (moonSprite && moonSprite.material instanceof THREE.SpriteMaterial) {
    moonDirScratch.copy(moon.position).normalize();
    moonSprite.position.copy(camera.position).addScaledVector(moonDirScratch, SKY_DOME_RADIUS * 0.82);
    const moonPulse = 0.93 + Math.sin(dayPhase * 0.41) * 0.08;
    moonSprite.material.opacity = THREE.MathUtils.clamp((1 - daylight) * 1.15 + duskDawn * 0.08, 0, 1) * moonPulse;
    moonSprite.scale.setScalar(26 + (1 - daylight) * 19 + Math.sin(dayPhase * 0.27) * 2.6);
  }

  if (waterUniforms) {
    waterUniforms.uTime.value += delta;
    waterUniforms.uDaylight.value = daylight;
  }

  updatePlayerTorch(delta, daylight);
  updateCloudLayer(delta, daylight);
  return daylight;
}

function updateStreaming() {
  const newChunkX = worldToChunkCoord(camera.position.x, CHUNK_SIZE_X);
  const newChunkZ = worldToChunkCoord(camera.position.z, CHUNK_SIZE_Z);

  if (newChunkX !== cameraChunkX || newChunkZ !== cameraChunkZ) {
    cameraChunkX = newChunkX;
    cameraChunkZ = newChunkZ;
    refreshChunkTargets(cameraChunkX, cameraChunkZ);
  }

  processChunkQueue(cameraChunkX, cameraChunkZ);
  processChunkMeshQueue();
  updateWaterPosition();
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);
  updatePlayerCombatState(delta);
  updateMovement(delta);
  updateStreaming();
  const daylight = updateLighting(delta);
  updatePlayerGun(delta);
  updateProjectiles(delta);
  updateImpactParticles(delta);
  updateZombies(delta, daylight);

  hudAccumulator += delta;
  if (hudAccumulator >= 0.2) {
    updateHud();
    hudAccumulator = 0;
  }

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyR") {
    regenerate(true);
    return;
  }

  if (event.code === "KeyT") {
    regenerate(false);
    return;
  }

  if (playerDead) return;
  pressedKeys.add(event.code);
  if (event.code === "Space") event.preventDefault();
});

window.addEventListener("keyup", (event) => {
  pressedKeys.delete(event.code);
});

window.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

window.addEventListener("mousedown", (event) => {
  if (event.button !== 0) return;
  if (playerDead) return;
  firingHeld = true;
  if (controls.isLocked) shootGun();
  event.preventDefault();
});

window.addEventListener("mouseup", (event) => {
  if (event.button !== 0) return;
  firingHeld = false;
});

window.addEventListener("blur", () => {
  firingHeld = false;
});

document.addEventListener("click", () => {
  if (playerDead) return;
  if (deathScreen && !deathScreen.classList.contains("hidden")) return;
  if (!controls.isLocked) controls.lock();
});

controls.addEventListener("lock", () => {
  if (playerDead) {
    controls.unlock();
    return;
  }
  jumpHeldLastFrame = false;
  firingHeld = false;
  updateHud();
});

controls.addEventListener("unlock", () => {
  pressedKeys.clear();
  jumpHeldLastFrame = false;
  firingHeld = false;
  updateHud();
});

if (deathRespawnButton) {
  deathRespawnButton.addEventListener("click", (event) => {
    event.stopPropagation();
    regenerate(false, true);
  });
}

if (deathNewSeedButton) {
  deathNewSeedButton.addEventListener("click", (event) => {
    event.stopPropagation();
    regenerate(true, true);
  });
}

initializeNoiseOffsets();
setupAtmosphere();
buildWater();
regenerate(false);
updateHud();
renderer.setAnimationLoop(animate);

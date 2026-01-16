// Game State
const gameState = {
  currentUser: null,
  currentCharacter: null,
  characters: {},
  users: JSON.parse(localStorage.getItem("users")) || {},
  turnBasedCombat: {
    inProgress: false,
    playerTurn: true,
    defending: false,
  },
};

// Quest system state
let questInProgress = false;
let questIntervalId = null;

// PvP State
let pvpInProgress = false;
let pvpEnemyHP = 0;
let pvpEnemyMaxHP = 0;
let pvpEnemyName = "";
let pvpEnemyLevel = 1;

// New: Define races with stat modifiers and abilities
const races = {
  Human: { str: 0, def: 0, spd: 0, eva: 0, ability: "Adaptability" },
  Elf: { str: -1, def: 0, spd: +3, eva: +2, ability: "Keen Senses" },
  Dwarf: { str: +3, def: +2, spd: -1, eva: -1, ability: "Stone Endurance" },
  Orc: { str: +5, def: -1, spd: 0, eva: 0, ability: "Frenzy" },
};

// New: Define classes with stat modifiers and skills
const classes = {
  Warrior: { str: +5, def: +3, spd: 0, eva: 0, skill: "Power Strike" },
  Mage: { str: 0, def: 0, spd: +2, eva: +1, skill: "Fireball" },
  Rogue: { str: +2, def: 0, spd: +4, eva: +3, skill: "Backstab" },
  Paladin: { str: +3, def: +4, spd: 0, eva: 0, skill: "Holy Shield" },
};

// New: Skill tree structure
const skillTree = {
  Warrior: [
    { id: "power_strike", name: "Power Strike", desc: "Strong melee attack", levelReq: 1, unlocked: true },
    { id: "berserk", name: "Berserk", desc: "Increase attack speed", levelReq: 5, unlocked: false, prerequisites: ["power_strike"] },
  ],
  Mage: [
    { id: "fireball", name: "Fireball", desc: "Cast fireball spell", levelReq: 1, unlocked: true },
    { id: "ice_shield", name: "Ice Shield", desc: "Temporary defense boost", levelReq: 4, unlocked: false, prerequisites: ["fireball"] },
  ],
  Rogue: [
    { id: "backstab", name: "Backstab", desc: "High damage from behind", levelReq: 1, unlocked: true },
    { id: "vanish", name: "Vanish", desc: "Become invisible for short time", levelReq: 6, unlocked: false, prerequisites: ["backstab"] },
  ],
  Paladin: [
    { id: "holy_shield", name: "Holy Shield", desc: "Block damage and reflect", levelReq: 1, unlocked: true },
    { id: "divine_blast", name: "Divine Blast", desc: "Area holy damage", levelReq: 7, unlocked: false, prerequisites: ["holy_shield"] },
  ],
};

// New: Equipment definitions with stat bonuses and rarity
const items = [
  { name: 'Iron Sword', type: 'weapon', strBonus: 5, rarity: 'common' },
  { name: 'Elven Bow', type: 'weapon', spdBonus: 7, rarity: 'rare' },
  { name: 'Dragon Scale Armor', type: 'armor', defBonus: 10, rarity: 'epic' },
  { name: 'Boots of Swiftness', type: 'boots', spdBonus: 3, evaBonus: 2, rarity: 'uncommon' },
  { name: 'Steel Shield', type: 'shield', defBonus: 8, rarity: 'common' },
];

// Sound effects setup (add mp3 files accordingly if possible)
const sounds = {
  attack: new Audio('attack.mp3'),
  defend: new Audio('defend.mp3'),
  skill: new Audio('skill.mp3'),
};

function playSound(action) {
  const sound = sounds[action];
  if (sound) {
    sound.currentTime = 0;
    sound.play();
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  updateTime();
  setInterval(updateTime, 1000);
});

function setupEventListeners() {
  document.getElementById("loginBtn").addEventListener("click", login);
  document.getElementById("registerBtn").addEventListener("click", register);
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("logoutGameBtn").addEventListener("click", logout);
  document.getElementById("logoutAccBtn").addEventListener("click", logout);
  document.getElementById("createCharBtn").addEventListener("click", openCreateChar);
  document.getElementById("playerMeritsContainer").addEventListener("click", () => {
    showMeritShop();
  });
  document.getElementById("quickCombatBtn").addEventListener("click", () => {
    switchTab("adventure");
    startTurnBasedCombat();
  });
  document.getElementById("questBtn").addEventListener("click", () => {
    switchTab("quests");
    startQuest();
  });

  // Attach combat action buttons listeners
  document.getElementById("attackBtn").addEventListener("click", playerAttack);
  document.getElementById("defendBtn").addEventListener("click", playerDefend);
  document.getElementById("skillBtn").addEventListener("click", playerSkill);
}

// Authentication functions
function toggleAuthForm() {
  document.getElementById("loginForm").classList.toggle("hidden");
  document.getElementById("registerForm").classList.toggle("hidden");
  document.getElementById("loginError").classList.add("hidden");
  document.getElementById("registerError").classList.add("hidden");
}

function login() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  const errorDiv = document.getElementById("loginError");

  if (!username || !password) {
    showError(errorDiv, "Please fill in all fields");
    return;
  }

  if (!gameState.users[username] || gameState.users[username].password !== password) {
    showError(errorDiv, "Invalid username or password");
    return;
  }

  gameState.currentUser = username;
  gameState.characters = gameState.users[username].characters || {};
  showCharacterSelection();
}

function register() {
  const username = document.getElementById("registerUsername").value.trim();
  const password = document.getElementById("registerPassword").value.trim();
  const confirm = document.getElementById("registerConfirm").value.trim();
  const errorDiv = document.getElementById("registerError");

  if (!username || !password || !confirm) {
    showError(errorDiv, "Please fill in all fields");
    return;
  }

  if (password !== confirm) {
    showError(errorDiv, "Passwords do not match");
    return;
  }

  if (gameState.users[username]) {
    showError(errorDiv, "Username already exists");
    return;
  }

  gameState.users[username] = { password, characters: {} };
  localStorage.setItem("users", JSON.stringify(gameState.users));
  showNotification("Account created! Please login.");
  toggleAuthForm();

  document.getElementById("loginUsername").value = "";
  document.getElementById("loginPassword").value = "";
}

function showCharacterSelection() {
  document.getElementById("authContainer").classList.add("hidden");
  document.getElementById("charSelectContainer").classList.remove("hidden");
  refreshCharacterList();
}

function refreshCharacterList() {
  const charGrid = document.getElementById("charGrid");
  charGrid.innerHTML = "";

  if (Object.keys(gameState.characters).length === 0) {
    charGrid.innerHTML =
      '<div class="col-span-2 text-center text-gray-400">No characters yet</div>';
    return;
  }

  for (const charName in gameState.characters) {
    const char = gameState.characters[charName];
    const card = document.createElement("div");
    card.className = "character-card";
    card.onclick = () => selectCharacter(charName);
    card.innerHTML = `
      <h3>${charName}</h3>
      <div class="text-xs text-gray-400">${char.race} ${char.class}</div>
      <div class="text-sm text-yellow-400 mt-2">Level ${char.level}</div>
    `;
    charGrid.appendChild(card);
  }
}

function openCreateChar() {
  const charName = prompt("Enter character name:");
  if (!charName) return;

  if (gameState.characters[charName]) {
    alert("Character already exists");
    return;
  }

  // New: Prompt for race, class, appearance with validation fallback
  const race = prompt("Choose race (Human/Elf/Dwarf/Orc):") || "Human";
  const isValidRace = Object.keys(races).includes(race);
  const chosenRace = isValidRace ? race : "Human";

  const charClass = prompt("Choose class (Warrior/Mage/Rogue/Paladin):") || "Warrior";
  const isValidClass = Object.keys(classes).includes(charClass);
  const chosenClass = isValidClass ? charClass : "Warrior";

  const appearance = prompt("Choose hair color (e.g. brown, black, blonde):") || "brown";

  // Base stats + race bonus + class bonus
  const baseStats = { str: 10, def: 10, spd: 10, eva: 10 };
  const raceMod = races[chosenRace];
  const classMod = classes[chosenClass];

  const finalStats = {
    str: baseStats.str + (raceMod.str || 0) + (classMod.str || 0),
    def: baseStats.def + (raceMod.def || 0) + (classMod.def || 0),
    spd: baseStats.spd + (raceMod.spd || 0) + (classMod.spd || 0),
    eva: baseStats.eva + (raceMod.eva || 0) + (classMod.eva || 0),
  };

  gameState.characters[charName] = {
    name: charName,
    race: chosenRace,
    class: chosenClass,
    appearance: appearance,
    level: 1,
    exp: 0,
    hp: 100,
    maxHp: 100,
    energy: 100,
    maxEnergy: 100,
    glory: 100,
    maxGlory: 100,
    gold: 1000,
    merits: 50,
    jewels: 0,
    stats: finalStats,
    mana: 100,
    maxMana: 100,
    skillCooldown: 0,
    inventory: [],
    equipment: {
      weapon: null,
      armor: null,
      boots: null,
      shield: null,
    },
    meritPurchases: [],
    jewelPurchases: [],
    createdAt: new Date().toLocaleDateString(),
    quests: [
      {
        id: 1,
        name: "Defeat 10 Goblins",
        progress: 0,
        goal: 10,
        rewardGold: 500,
        rewardExp: 200,
        completed: false,
        claimed: false,
      },
      {
        id: 2,
        name: "Reach Level 10",
        progress: 1,
        goal: 10,
        rewardGold: 1000,
        rewardExp: 500,
        completed: false,
        claimed: false,
      },
      {
        id: 3,
        name: "Collect 5 Herbs",
        type: "collect",
        itemsRequired: { herb: 5 },
        progress: 0,
        goal: 5,
        rewardGold: 300,
        rewardExp: 150,
        completed: false,
        claimed: false,
      },
      // New example: Narrative quest with branching
      {
        id: 100,
        name: "A Mysterious Stranger",
        progress: 0,
        completed: false,
        claimed: false,
        type: "narrative",
        dialogue: [
          {
            text: "A hooded figure beckons you to sit. What do you do?",
            choices: [
              { text: "Hear them out", next: 1 },
              { text: "Walk away", next: 3 },
            ],
          },
          {
            text: "They offer you a secret mission. Do you accept?",
            choices: [
              { text: "Yes", next: null, result: "accept" },
              { text: "No", next: null, result: "decline" },
            ],
          },
          {
            text: "You leave the tavern. Quest ends.",
            choices: [],
          },
          {
            text: "You ignore the stranger and continue your journey.",
            choices: [],
          },
        ],
        questState: {
          currentNode: 0,
          inProgress: false,
        },
        rewardGold: 500,
        rewardExp: 300,
        rewardItem: "Secret Map",
        rewardAchievement: "Secret Ally",
      },
    ],
    unlockedSkills: [], // track unlocked skills for class advancement
  };

  gameState.users[gameState.currentUser].characters = gameState.characters;
  localStorage.setItem("users", JSON.stringify(gameState.users));
  refreshCharacterList();
  showNotification(`${charName} created!`);
}

function selectCharacter(charName) {
  gameState.currentCharacter = gameState.characters[charName];
  document.getElementById("charSelectContainer").classList.add("hidden");
  document.getElementById("gameContainer").classList.remove("hidden");
  loadCharacterUI();
}

function loadCharacterUI() {
  const char = gameState.currentCharacter;
  if (!char) return;

  // Compute effective stats with equipment bonuses
  const effectiveStats = { ...char.stats };
  if (char.equipment) {
    for (const slot in char.equipment) {
      const eq = char.equipment[slot];
      if (!eq) continue;
      if (eq.strBonus) effectiveStats.str += eq.strBonus;
      if (eq.defBonus) effectiveStats.def += eq.defBonus;
      if (eq.spdBonus) effectiveStats.spd += eq.spdBonus;
      if (eq.evaBonus) effectiveStats.eva += eq.evaBonus;
    }
  }

  document.getElementById(
    "charInfo"
  ).textContent = `${char.name} • ${char.race} ${char.class} • Hair: ${char.appearance} • Ability: ${races[char.race]?.ability} • Class Skill: ${classes[char.class]?.skill}`;

  document.getElementById("charName").textContent = char.name;
  document.getElementById("charRace").textContent = char.race;
  document.getElementById("charClass").textContent = char.class;
  document.getElementById("playerLevel").textContent = char.level;
  document.getElementById("playerGold").textContent = char.gold;
  document.getElementById("playerHP").textContent = char.hp;
  document.getElementById("maxHP").textContent = char.maxHp;
  document.getElementById("playerEnergy").textContent = char.energy;
  document.getElementById("maxEnergy").textContent = char.maxEnergy;
  document.getElementById("playerGlory").textContent = char.glory;
  document.getElementById("maxGlory").textContent = char.maxGlory;
  document.getElementById("playerMerits").textContent = char.merits;
  document.getElementById("playerJewels").textContent = char.jewels;
  document.getElementById("meritShopBalanceModal").textContent = char.merits;
  document.getElementById("charExp").textContent = char.exp;
  document.getElementById("expNext").textContent = char.level * 500;

  // Show effective stats (with equipment bonuses)
  document.getElementById("statStr").textContent = effectiveStats.str;
  document.getElementById("statDef").textContent = effectiveStats.def;
  document.getElementById("statSpd").textContent = effectiveStats.spd;
  document.getElementById("statEva").textContent = effectiveStats.eva;

  document.getElementById("memberSince").textContent = char.createdAt;

  // Update mana display and bar
  const manaElem = document.getElementById("playerMana");
  const maxManaElem = document.getElementById("maxMana");
  const manaBar = document.getElementById("manaBar");
  if (manaElem && maxManaElem && manaBar) {
    manaElem.textContent = char.mana || 0;
    maxManaElem.textContent = char.maxMana || 0;
    manaBar.style.width = ((char.mana || 0) / (char.maxMana || 1)) * 100 + "%";
  }

  // Update training tab stats display with actual values and equipment bonuses
  const trainingTab = document.getElementById("trainingTab");
  if (trainingTab) {
    const buttons = trainingTab.querySelectorAll("button");
    buttons.forEach((btn) => {
      let statName = null;
      if (btn.textContent.includes("Strength")) statName = "str";
      else if (btn.textContent.includes("Defense")) statName = "def";
      else if (btn.textContent.includes("Speed")) statName = "spd";
      else if (btn.textContent.includes("Evasion")) statName = "eva";
      if (statName) {
        const divs = btn.getElementsByTagName("div");
        if (divs.length > 1) {
          divs[1].textContent = `Cost: 50 Gold | Gain: +2 ${statName.toUpperCase()}\nCurrent: ${
            effectiveStats[statName]
          }`;
        }
      }
    });
  }

  updateMeritPurchases();
  updateMeritPurchasesModal();
  updateBars();
  renderQuests();

  // Update inventory list
  const inventoryList = document.getElementById("inventoryList");
  if (char.inventory.length === 0) {
    inventoryList.innerHTML = '<div class="text-gray-400">Your inventory is empty</div>';
  } else {
    inventoryList.innerHTML = char.inventory
      .map((item) => `<div>${item.name} x${item.qty}</div>`)
      .join("");
  }

  // Update equipped gear display in Inventory tab (optional enhancement, add UI)
  renderEquipmentUI();
}

// New: Show equipped gear info somewhere in inventory or stats tab (basic console log or later UI update)
function renderEquipmentUI() {
  // For brevity, no DOM elements detailed here.
  // Could create an equipment panel in inventory with equip/unequip buttons
  // Implement later if needed
}

// Merit Shop UI functions
function updateMeritPurchases() {
  const char = gameState.currentCharacter;
  const container = document.getElementById("purchasedItems");

  if (!char.meritPurchases || char.meritPurchases.length === 0) {
    container.innerHTML = '<div class="text-gray-400 text-sm">No items purchased yet</div>';
    return;
  }

  container.innerHTML = char.meritPurchases
    .map(
      (item) => `
        <div class="stat-boost-item">
            <div class="flex justify-between items-center">
                <span>${item.name}</span>
                <span class="text-xs text-green-400">✓ Applied</span>
            </div>
        </div>
    `
    )
    .join("");
}

function updateMeritPurchasesModal() {
  const char = gameState.currentCharacter;
  const container = document.getElementById("purchasedItemsModal");
  if (!container) return;

  if (!char.meritPurchases || char.meritPurchases.length === 0) {
    container.innerHTML = '<div class="text-gray-400 text-sm">No items purchased yet</div>';
    return;
  }

  container.innerHTML = char.meritPurchases
    .map(
      (item) => `
        <div class="stat-boost-item">
            <div class="flex justify-between items-center">
                <span>${item.name}</span>
                <span class="text-xs text-green-400">✓ Applied</span>
            </div>
        </div>
    `
    )
    .join("");
}

function buyMeritItem(itemName, cost, statType, value) {
  const char = gameState.currentCharacter;
  if (!char) return;

  if (char.merits < cost) {
    showNotification("Not enough merits!");
    return;
  }

  char.merits -= cost;

  // Apply the boost
  if (
    statType === "str" ||
    statType === "def" ||
    statType === "spd" ||
    statType === "eva"
  ) {
    char.stats[statType] += value;
  } else if (statType === "maxHp") {
    char.maxHp += value;
    char.hp = char.maxHp;
  } else if (statType === "maxEnergy") {
    char.maxEnergy += value;
    char.energy = char.maxEnergy;
  } else if (statType === "jewels") {
    char.jewels += value;
  }

  // Track purchase
  if (!char.meritPurchases) {
    char.meritPurchases = [];
  }
  char.meritPurchases.push({ name: itemName, cost: cost });

  // Save to localStorage
  saveCharacterData();

  loadCharacterUI();
  showNotification(`✨ ${itemName} purchased for ${cost} merits!`);
}

function updateBars() {
  const char = gameState.currentCharacter;
  document.getElementById("hpBar").style.width = (char.hp / char.maxHp) * 100 + "%";
  document.getElementById("energyBar").style.width =
    (char.energy / char.maxEnergy) * 100 + "%";
  document.getElementById("gloryBar").style.width =
    (char.glory / char.maxGlory) * 100 + "%";
  document.getElementById("expBar").style.width =
    (char.exp / (char.level * 500)) * 100 + "%";

  // Mana bar update done in loadCharacterUI()
}

function switchTab(tabName) {
  document.querySelectorAll(".tab-content").forEach((tab) => tab.classList.add("hidden"));
  document.querySelectorAll(".tab-button").forEach((btn) => btn.classList.remove("active"));
  document.getElementById(tabName + "Tab").classList.remove("hidden");
  const btn = document.querySelector(`[data-tab="${tabName}"]`);
  if (btn) btn.classList.add("active");

  if (tabName === "pvp") renderPvPOpponents();
  if (tabName === "quests") renderQuests();
}

// ----- TURN-BASED COMBAT SYSTEM -----

function startTurnBasedCombat() {
  const char = gameState.currentCharacter;
  if (!char) {
    showNotification("Select a character first!");
    return;
  }
  if (char.energy < 15) {
    showNotification("Not enough energy!");
    return;
  }
  if (gameState.turnBasedCombat.inProgress) {
    showNotification("Combat already in progress!");
    return;
  }

  char.energy = Math.max(0, char.energy - 15);
  saveCharacterData();
  loadCharacterUI();

  // Setup enemy with scaling HP
  const enemyMaxHP = 80 + (char.level - 1) * 20;
  const enemyHP = enemyMaxHP;

  gameState.combatEnemy = {
    hp: enemyHP,
    maxHp: enemyMaxHP,
    name: "Shadow Beast",
  };

  gameState.turnBasedCombat.inProgress = true;
  gameState.turnBasedCombat.playerTurn = true;
  gameState.turnBasedCombat.defending = false;

  // Show combat area
  document.getElementById("combatArea").classList.remove("hidden");

  // Update combat UI
  updateTurnBasedCombatUI();

  addCombatLog(`Combat started against ${gameState.combatEnemy.name}! Your turn.`, "info");

  updateCombatButtons(true);
}

function updateTurnBasedCombatUI() {
  const char = gameState.currentCharacter;
  const enemy = gameState.combatEnemy;

  // Player
  document.getElementById("playerCombatHP").textContent = char.hp;
  document.getElementById("playerCombatMaxHP").textContent = char.maxHp;
  document.getElementById("playerCombatHPBar").style.width = (char.hp / char.maxHp) * 100 + "%";

  // Enemy
  document.getElementById("enemyName").textContent = enemy.name;
  document.getElementById("enemyHP").textContent = enemy.hp;
  document.getElementById("enemyMaxHP").textContent = enemy.maxHp;
  document.getElementById("enemyHPBar").style.width = (enemy.hp / enemy.maxHp) * 100 + "%";
}

function updateCombatButtons(enabled) {
  document.getElementById("attackBtn").disabled = !enabled;
  document.getElementById("defendBtn").disabled = !enabled;
  document.getElementById("skillBtn").disabled = !enabled;
}

function endTurnBasedCombat(win) {
  const char = gameState.currentCharacter;
  gameState.turnBasedCombat.inProgress = false;
  gameState.turnBasedCombat.defending = false;

  // Hide combat area
  document.getElementById("combatArea").classList.add("hidden");
  updateCombatButtons(false);

  if (win) {
    const rewardGold = 200 + char.level * 50;
    const rewardExp = 80 + char.level * 20;

    char.gold += rewardGold;
    char.exp += rewardExp;

    // Add quest progress for quest id 1 ("Defeat 10 Goblins") on combat win
    const goblinQuest = char.quests.find((q) => q.id === 1 && !q.completed);
    if (goblinQuest) {
      goblinQuest.progress = Math.min(goblinQuest.progress + 1, goblinQuest.goal);
      if (goblinQuest.progress >= goblinQuest.goal) {
        goblinQuest.completed = true;
        showNotification(`Quest "${goblinQuest.name}" is now completed! Claim your reward.`);
      }
    }

    checkLevelUp();

    addCombatLog(`Victory! You earned ${rewardGold} gold and ${rewardExp} EXP!`, "success");
    showNotification("Combat won!");
  } else {
    char.hp = char.maxHp;
    addCombatLog("Defeat! You were defeated...", "danger");
    showNotification("Combat lost!");
  }

  saveCharacterData();
  loadCharacterUI();
  renderQuests();
}

// Player action: Attack
function playerAttack() {
  if (!gameState.turnBasedCombat.inProgress) return;

  if (!gameState.turnBasedCombat.playerTurn) {
    showNotification("Wait for your turn!");
    return;
  }

  const char = gameState.currentCharacter;
  const enemy = gameState.combatEnemy;

  // Damage calculation: random + strength (effective stat with equipment)
  const effectiveStr = getEffectiveStat("str");
  const damage = Math.floor(Math.random() * 20) + effectiveStr;

  enemy.hp = Math.max(0, enemy.hp - damage);

  addCombatLog(`You attack for ${damage} damage!`, "success");
  updateTurnBasedCombatUI();

  playSound("attack");

  if (enemy.hp <= 0) {
    endTurnBasedCombat(true);
    return;
  }

  // End player's turn
  gameState.turnBasedCombat.playerTurn = false;
  gameState.turnBasedCombat.defending = false;
  updateCombatButtons(false);

  // Enemy's turn, delay slightly for UX
  setTimeout(enemyTurn, 1000);
}

// Player action: Defend
function playerDefend() {
  if (!gameState.turnBasedCombat.inProgress) return;

  if (!gameState.turnBasedCombat.playerTurn) {
    showNotification("Wait for your turn!");
    return;
  }

  addCombatLog("You take a defensive stance!", "info");
  gameState.turnBasedCombat.defending = true;

  playSound("defend");

  gameState.turnBasedCombat.playerTurn = false;
  updateCombatButtons(false);

  setTimeout(enemyTurn, 1000);
}

// Player action: Skill
function playerSkill() {
  if (!gameState.turnBasedCombat.inProgress) return;
  if (!gameState.turnBasedCombat.playerTurn) {
    showNotification("Wait for your turn!");
    return;
  }

  const char = gameState.currentCharacter;
  const enemy = gameState.combatEnemy;

  if (char.mana < 20) {
    showNotification("Not enough mana!");
    return;
  }
  if (char.skillCooldown > 0) {
    showNotification(`Skill cooldown: ${char.skillCooldown} turn(s) remaining`);
    return;
  }

  char.mana -= 20;
  char.skillCooldown = 3; // cooldown length in turns

  // Skill does higher damage: random + 1.5 * effective strength
  const effectiveStr = getEffectiveStat("str");
  const damage = Math.floor(Math.random() * 35) + Math.floor(1.5 * effectiveStr);

  enemy.hp = Math.max(0, enemy.hp - damage);

  addCombatLog(`You use special skill for ${damage} damage!`, "success");
  updateTurnBasedCombatUI();
  updateManaUI();

  playSound("skill");

  if (enemy.hp <= 0) {
    endTurnBasedCombat(true);
    return;
  }

  gameState.turnBasedCombat.playerTurn = false;
  gameState.turnBasedCombat.defending = false;
  updateCombatButtons(false);

  setTimeout(enemyTurn, 1000);
}

function updateManaUI() {
  const char = gameState.currentCharacter;
  if (!char) return;
  const manaElem = document.getElementById("playerMana");
  const maxManaElem = document.getElementById("maxMana");
  const manaBar = document.getElementById("manaBar");
  if (manaElem && maxManaElem && manaBar) {
    manaElem.textContent = char.mana;
    maxManaElem.textContent = char.maxMana;
    manaBar.style.width = (char.mana / char.maxMana) * 100 + "%";
  }
}

function decreaseCooldowns() {
  const char = gameState.currentCharacter;
  if (char && char.skillCooldown > 0) {
    char.skillCooldown--;
    if (char.skillCooldown <= 0) {
      // Enable skill button after cooldown
      document.getElementById("skillBtn").disabled = false;
    }
  }
}

// Enemy turn function
function enemyTurn() {
  if (!gameState.turnBasedCombat.inProgress) return;

  const char = gameState.currentCharacter;
  const enemy = gameState.combatEnemy;

  // Enemy damage random + scale by player level / 2
  let damage = Math.floor(Math.random() * 15) + Math.floor(char.level / 2);

  // If player defends, reduce damage by half
  if (gameState.turnBasedCombat.defending) {
    damage = Math.floor(damage / 2);
    addCombatLog("Your defense reduced the incoming damage!", "info");
    gameState.turnBasedCombat.defending = false; // Reset defend after damage reduction
  }

  // Apply damage reduction if any by jewel effects
  if (char.damageReduction) {
    damage = Math.floor(damage * (1 - char.damageReduction));
  }

  char.hp = Math.max(0, char.hp - damage);

  addCombatLog(`Enemy attacks for ${damage} damage!`, "danger");
  updateTurnBasedCombatUI();
  updateManaUI();

  if (char.hp <= 0) {
    endTurnBasedCombat(false);
    return;
  }

  // Player's turn again
  gameState.turnBasedCombat.playerTurn = true;
  updateCombatButtons(true);
  addCombatLog("Your turn.", "info");

  // Decrease skill cooldown turn counter
  decreaseCooldowns();
  saveCharacterData();
}

// Add one line in the combat log area with style
function addCombatLog(message, type = "info") {
  const log = document.getElementById("combatLog");
  const msgDiv = document.createElement("div");
  msgDiv.className = `log-message ${type}`;
  msgDiv.textContent = message;
  log.appendChild(msgDiv);
  log.scrollTop = log.scrollHeight;
}

// Quest system functions
function startQuest() {
  const char = gameState.currentCharacter;
  if (!char) return;

  if (questInProgress) {
    showNotification("Quest already in progress!");
    return;
  }

  if (char.energy < 25) {
    showNotification("Not enough energy to start a quest!");
    return;
  }

  // Find the next incomplete quest
  const activeQuest = char.quests.find((q) => !q.completed);
  if (!activeQuest) {
    showNotification("No available quests. All completed!");
    return;
  }

  // Handle branching narrative quests differently
  if (activeQuest.type === "narrative") {
    activeQuest.questState.inProgress = true;
    activeQuest.questState.currentNode = 0;
    showNarrativeQuestDialog(activeQuest);
    char.energy -= 25;
    saveCharacterData();
    loadCharacterUI();
    questInProgress = true;
    return;
  }

  // Consume energy upfront
  char.energy -= 25;
  saveCharacterData();
  loadCharacterUI();

  questInProgress = true;
  showNotification(`Quest started: ${activeQuest.name}.`);

  // Clear any previous interval if active
  if (questIntervalId) clearInterval(questIntervalId);

  // Progress quest every 2 seconds, but limit it only to non-goblin quests to avoid double progress on quest 1
  questIntervalId = setInterval(() => {
    progressQuest(activeQuest);
  }, 2000);
}

// New: Show narrative quest dialogue modal with branching choices
function showNarrativeQuestDialog(quest) {
  // Create modal elements if not exist
  let modal = document.getElementById("questDialogueModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "questDialogueModal";
    modal.className = "fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-60";
    modal.innerHTML = `
      <div class="bg-gray-900 text-yellow-300 p-6 rounded-lg max-w-lg w-full">
        <p id="dialogueText" class="mb-4"></p>
        <div id="dialogueChoices" class="space-y-2"></div>
        <button id="closeQuestDialogBtn" class="mt-4 btn-danger">Cancel</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById("closeQuestDialogBtn").addEventListener("click", () => {
      closeNarrativeQuestDialog(quest);
    });
  }

  // Show modal
  modal.classList.remove("hidden");
  showDialogueNode(quest);
}

function showDialogueNode(quest) {
  const modal = document.getElementById("questDialogueModal");
  const textElem = document.getElementById("dialogueText");
  const choicesElem = document.getElementById("dialogueChoices");
  const state = quest.questState;

  const node = quest.dialogue[state.currentNode];
  textElem.textContent = node.text;
  choicesElem.innerHTML = "";

  if (node.choices.length === 0) {
    // end node
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close";
    closeBtn.className = "btn-primary w-full";
    closeBtn.onclick = () => closeNarrativeQuestDialog(quest);
    choicesElem.appendChild(closeBtn);
  } else {
    node.choices.forEach((choice, idx) => {
      const btn = document.createElement("button");
      btn.textContent = choice.text;
      btn.className = "btn-primary w-full";
      btn.onclick = () => {
        if (choice.next !== null && choice.next !== undefined) {
          state.currentNode = choice.next;
          showDialogueNode(quest);
        } else if(choice.result === "accept") {
          applyNarrativeQuestRewards(quest);
          quest.completed = true;
          quest.claimed = false;
          state.inProgress = false;
          questInProgress = false;
          showNotification(`Quest "${quest.name}" completed! Claim your reward.`);
          closeNarrativeQuestDialog(quest);
          renderQuests();
          saveCharacterData();
        } else if (choice.result === "decline") {
          state.inProgress = false;
          questInProgress = false;
          closeNarrativeQuestDialog(quest);
          showNotification(`You declined the quest: "${quest.name}".`);
          renderQuests();
          saveCharacterData();
        } else {
          closeNarrativeQuestDialog(quest);
        }
      };
      choicesElem.appendChild(btn);
    });
  }
}

function closeNarrativeQuestDialog(quest) {
  const modal = document.getElementById("questDialogueModal");
  if (modal) {
    modal.classList.add("hidden");
  }
  questInProgress = false;
  saveCharacterData();
}

// Give narrative quest special rewards: items, achievements, gold, etc.
function applyNarrativeQuestRewards(quest) {
  const char = gameState.currentCharacter;
  if (!char) return;

  char.gold += quest.rewardGold || 0;
  char.exp += quest.rewardExp || 0;

  if (quest.rewardItem) {
    let inventoryItem = char.inventory.find((i) => i.name === quest.rewardItem);
    if (inventoryItem) {
      inventoryItem.qty++;
    } else {
      char.inventory.push({ name: quest.rewardItem, qty: 1 });
    }
  }

  // Add achievement (just as new meritPurchase entry for demo)
  if (quest.rewardAchievement) {
    if (!char.meritPurchases) char.meritPurchases = [];
    char.meritPurchases.push({ name: `🏆 Achievement: ${quest.rewardAchievement}`, cost: 0 });
  }
}

// Continue legacy quest progression
function progressQuest(quest) {
  const char = gameState.currentCharacter;
  if (!char) return;

  if (quest.completed) {
    clearInterval(questIntervalId);
    questInProgress = false;
    showNotification(`Quest "${quest.name}" completed! Claim your reward.`);
    renderQuests();
    return;
  }

  if (quest.id === 1) {
    // For quest 1 (Defeat Goblins), progress handled on combat wins, so only show status here, no auto increase.
  } else if (quest.id === 2) {
    // Level 10 quest: tied to character level
    quest.progress = char.level;
    if (quest.progress >= quest.goal) quest.completed = true;
  } else if (quest.type === "collect" && quest.itemsRequired) {
    // Check collect quest progress based on inventory (for example herbs)
    const herbs = char.inventory.find((i) => i.name.toLowerCase() === "herb");
    const qty = herbs ? herbs.qty : 0;
    quest.progress = Math.min(qty, quest.goal);
    if (quest.progress >= quest.goal) quest.completed = true;
  } else {
    quest.progress = Math.min(quest.progress + 1, quest.goal);
    if (quest.progress >= quest.goal) quest.completed = true;
  }

  renderQuests();
  saveCharacterData();

  if (quest.completed) {
    clearInterval(questIntervalId);
    questInProgress = false;
    showNotification(`Quest "${quest.name}" completed! Claim your reward.`);
  }
}

function cancelQuest() {
  if (!questInProgress) {
    showNotification("No quest in progress.");
    return;
  }
  clearInterval(questIntervalId);
  questInProgress = false;
  showNotification("Quest cancelled.");
}

function renderQuests() {
  const questsList = document.getElementById("questsList");
  const char = gameState.currentCharacter;
  if (!char || !char.quests) {
    questsList.innerHTML = '<div class="text-gray-400">No quests available</div>';
    return;
  }
  questsList.innerHTML = char.quests
    .map((q) => {
      let cancelBtnHtml = "";
      if (questInProgress && !q.completed) {
        cancelBtnHtml = `<button class="btn-danger text-xs mt-1" onclick="cancelQuest()">Cancel Quest</button>`;
      }
      // Include extra narrative quest rewards display
      let rewardsText = `Reward: ${q.rewardGold || 0} Gold + ${q.rewardExp || 0} EXP`;
      if (q.rewardItem) rewardsText += ` + Item: ${q.rewardItem}`;
      if (q.rewardAchievement) rewardsText += ` + Achievement: ${q.rewardAchievement}`;

      return `
        <div class="quest-card ${q.completed ? "opacity-50" : ""}">
            <div class="font-bold text-yellow-400">${q.name}</div>
            <div class="text-xs text-gray-400 mt-2">Progress: ${q.progress || 0}/${q.goal || "N/A"}</div>
            <div class="reward-badge mt-1 mb-1">${rewardsText}</div>
            ${
              q.completed
                ? `<button class="btn-success text-xs mt-1" onclick="claimQuestReward(${q.id})" ${
                    q.claimed ? 'disabled style="opacity:.5;cursor:not-allowed;"' : ""
                  }>${q.claimed ? "Reward Claimed" : "Claim Reward"}</button>`
                : questInProgress
                ? cancelBtnHtml
                : ""
            }
        </div>
        `;
    })
    .join("");
}

function claimQuestReward(questId) {
  const char = gameState.currentCharacter;
  if (!char) return;

  const quest = char.quests.find((q) => q.id === questId);
  if (!quest) return;

  if (!quest.completed) {
    showNotification("Complete the quest first!");
    return;
  }
  if (quest.claimed) {
    showNotification("Reward already claimed!");
    return;
  }

  char.gold += quest.rewardGold || 0;
  char.exp += quest.rewardExp || 0;

  // Grant reward item if any
  if (quest.rewardItem) {
    let invItem = char.inventory.find((i) => i.name === quest.rewardItem);
    if (invItem) invItem.qty++;
    else char.inventory.push({ name: quest.rewardItem, qty: 1 });
  }

  // Add achievement (bonus) as purchased merit item (if not already added)
  if (quest.rewardAchievement) {
    if (!char.meritPurchases) char.meritPurchases = [];
    const alreadyHas = char.meritPurchases.some((i) => i.name === `🏆 Achievement: ${quest.rewardAchievement}`);
    if (!alreadyHas) {
      char.meritPurchases.push({ name: `🏆 Achievement: ${quest.rewardAchievement}`, cost: 0 });
    }
  }

  quest.claimed = true;

  checkLevelUp();
  saveCharacterData();
  renderQuests();
  loadCharacterUI();

  showNotification(
    `Quest "${quest.name}" reward claimed! +${quest.rewardGold} Gold, +${quest.rewardExp} EXP`
  );
}

// PvP battle system against NPC (no changes here for now)
function challengeOpponent(name, level) {
  if (pvpInProgress) {
    showNotification("Finish current PvP battle first!");
    return;
  }
  const char = gameState.currentCharacter;
  if (!char) {
    showNotification("Select a character first!");
    return;
  }
  if (char.energy < 25) {
    showNotification("Not enough energy for PvP battle!");
    return;
  }
  char.energy -= 25;
  saveCharacterData();
  loadCharacterUI();

  pvpEnemyName = name;
  pvpEnemyLevel = level;

  pvpEnemyMaxHP = 80 + (pvpEnemyLevel - 1) * 20;
  pvpEnemyHP = pvpEnemyMaxHP;

  pvpInProgress = true;

  document.getElementById("pvpTab").innerHTML = `
    <div class="content-panel">
      <h2>🗡️ PvP Battle vs ${pvpEnemyName} (Level ${pvpEnemyLevel})</h2>
      <div class="grid md:grid-cols-2 gap-4 mb-6">
        <div>
          <div class="text-center text-yellow-500 font-black mb-3">${char.name}</div>
          <div class="bg-gray-950 p-4 rounded-lg border-2 border-blue-900">
            <div class="text-sm mb-3 font-bold">
              Health:
              <span id="playerPvPHP" class="text-red-400">${char.hp}</span>/
              <span id="playerPvPMaxHP" class="text-gray-400">${char.maxHp}</span>
            </div>
            <div class="stat-bar">
              <div id="playerPvPHPBar" class="stat-fill health-fill" style="width: 100%"></div>
            </div>
          </div>
        </div>
        <div>
          <div class="text-center text-red-500 font-black mb-3">${pvpEnemyName}</div>
          <div class="enemy-card">
            <div class="text-sm mb-3 font-bold">
              Health:
              <span id="enemyPvPHP" class="text-red-400">${pvpEnemyHP}</span>/
              <span id="enemyPvPMaxHP" class="text-gray-400">${pvpEnemyMaxHP}</span>
            </div>
            <div class="stat-bar">
              <div id="enemyPvPHPBar" class="stat-fill health-fill" style="width: 100%"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="grid md:grid-cols-3 gap-3 mb-6">
        <button class="btn-primary combat-action-btn" id="pvpAttackBtn">⚔️ Attack</button>
        <button class="btn-primary combat-action-btn" id="pvpDefendBtn">🛡️ Defend</button>
        <button class="btn-primary combat-action-btn" id="pvpSkillBtn">✨ Skill</button>
      </div>
      <div class="combat-log scrollbar-custom" id="pvpCombatLog">
        <div class="log-message info">PvP Battle started!</div>
      </div>
      <button class="btn-danger w-full" id="pvpQuitBtn">Quit PvP</button>
    </div>
  `;

  document.getElementById("pvpAttackBtn").addEventListener("click", pvpPlayerAttack);
  document.getElementById("pvpDefendBtn").addEventListener("click", pvpPlayerDefend);
  document.getElementById("pvpSkillBtn").addEventListener("click", pvpPlayerSkill);
  document.getElementById("pvpQuitBtn").addEventListener("click", pvpQuitBattle);

  updatePvPBars();
}

function updatePvPBars() {
  const char = gameState.currentCharacter;
  document.getElementById("playerPvPHP").textContent = char.hp;
  document.getElementById("playerPvPMaxHP").textContent = char.maxHp;
  document.getElementById("playerPvPHPBar").style.width = (char.hp / char.maxHp) * 100 + "%";

  document.getElementById("enemyPvPHP").textContent = pvpEnemyHP;
  document.getElementById("enemyPvPMaxHP").textContent = pvpEnemyMaxHP;
  document.getElementById("enemyPvPHPBar").style.width = (pvpEnemyHP / pvpEnemyMaxHP) * 100 + "%";
}

function appendPvPLog(message, type = "info") {
  const log = document.getElementById("pvpCombatLog");
  const msgDiv = document.createElement("div");
  msgDiv.className = `log-message ${type}`;
  msgDiv.textContent = message;
  log.appendChild(msgDiv);
  log.scrollTop = log.scrollHeight;
}

function pvpPlayerAttack() {
  if (!pvpInProgress) return;
  const char = gameState.currentCharacter;
  // Use effective str with equipment
  const damage =
    Math.floor(Math.random() * 20) + getEffectiveStat("str");
  pvpEnemyHP = Math.max(0, pvpEnemyHP - damage);
  appendPvPLog(`You attack for ${damage} damage!`, "success");
  updatePvPBars();

  if (pvpEnemyHP <= 0) {
    pvpEndBattle(true);
    return;
  }
  setTimeout(pvpEnemyAttack, 600);
}

function pvpPlayerDefend() {
  if (!pvpInProgress) return;
  appendPvPLog("You defend!", "info");
  setTimeout(() => {
    const char = gameState.currentCharacter;
    let damage = Math.floor(Math.random() * 10) + 5;
    char.hp = Math.max(0, char.hp - damage);
    appendPvPLog(`Enemy attacks! You take ${damage} damage.`, "danger");
    updatePvPBars();
    if (char.hp <= 0) {
      pvpEndBattle(false);
    }
  }, 600);
}

function pvpPlayerSkill() {
  if (!pvpInProgress) return;
  const char = gameState.currentCharacter;
  const damage = Math.floor(Math.random() * 35) + 1.5 * getEffectiveStat("str");
  pvpEnemyHP = Math.max(0, pvpEnemyHP - Math.floor(damage));
  appendPvPLog(`You use skill for ${Math.floor(damage)} damage!`, "success");
  updatePvPBars();

  if (pvpEnemyHP <= 0) {
    pvpEndBattle(true);
    return;
  }
  setTimeout(pvpEnemyAttack, 600);
}

function pvpEnemyAttack() {
  if (!pvpInProgress) return;
  const char = gameState.currentCharacter;
  let damage = Math.floor(Math.random() * 15) + Math.floor(pvpEnemyLevel / 2);

  // Apply damage reduction if any
  if (char.damageReduction) {
    damage = Math.floor(damage * (1 - char.damageReduction));
  }

  char.hp = Math.max(0, char.hp - damage);
  appendPvPLog(`Enemy attacks for ${damage} damage!`, "danger");
  updatePvPBars();
  if (char.hp <= 0) {
    pvpEndBattle(false);
  }
}

function pvpEndBattle(won) {
  const char = gameState.currentCharacter;
  if (won) {
    let rewardGold = 200 + pvpEnemyLevel * 50;
    let rewardExp = 80 + pvpEnemyLevel * 20;
    char.gold += rewardGold;
    char.exp += rewardExp;

    // Progress 'Defeat 10 Goblins' quest if applicable
    const goblinQuest = char.quests.find((q) => q.id === 1 && !q.completed);
    if (goblinQuest) {
      goblinQuest.progress = Math.min(goblinQuest.progress + 1, goblinQuest.goal);
      if (goblinQuest.progress >= goblinQuest.goal) {
        goblinQuest.completed = true;
        showNotification(`Quest "${goblinQuest.name}" is now completed! Claim your reward.`);
      }
    }

    checkLevelUp();
    appendPvPLog(`Victory! You earned ${rewardGold} gold and ${rewardExp} EXP!`, "success");
    showNotification("PvP battle won!");
  } else {
    char.hp = char.maxHp;
    appendPvPLog("Defeat! You lost the battle.", "danger");
    showNotification("PvP battle lost!");
  }
  pvpInProgress = false;
  updatePvPBars();
  saveCharacterData();
  loadCharacterUI();
  renderPvPOpponents();
}

function pvpQuitBattle() {
  if (!pvpInProgress) {
    renderPvPOpponents();
    return;
  }
  pvpInProgress = false;
  showNotification("Left PvP battle");
  loadCharacterUI();
  renderPvPOpponents();
}

function renderPvPOpponents() {
  document.getElementById("pvpTab").innerHTML = `
    <div class="content-panel">
      <h2>🗡️ PvP Arena</h2>
      <p class="text-gray-400 mb-6 font-semibold">
        Challenge the computer and climb the ranks!
      </p>
      <div id="pvpOpponents" class="space-y-3 mb-6">
        <div class="opponent-card" onclick="challengeOpponent('Player1', 15)">
          <div class="flex justify-between items-center">
            <span class="font-bold text-yellow-400">Player1</span>
            <span class="pvp-rank">Rank: Gold</span>
          </div>
          <div class="text-xs text-gray-400 mt-2">Level 15 • Wins: 45</div>
        </div>
        <div class="opponent-card" onclick="challengeOpponent('Player2', 18)">
          <div class="flex justify-between items-center">
            <span class="font-bold text-yellow-400">Player2</span>
            <span class="pvp-rank">Rank: Silver</span>
          </div>
          <div class="text-xs text-gray-400 mt-2">Level 18 • Wins: 32</div>
        </div>
        <div class="opponent-card" onclick="challengeOpponent('Player3', 20)">
          <div class="flex justify-between items-center">
            <span class="font-bold text-yellow-400">Player3</span>
            <span class="pvp-rank">Rank: Bronze</span>
          </div>
          <div class="text-xs text-gray-400 mt-2">Level 20 • Wins: 18</div>
        </div>
      </div>
    </div>
  `;
}

// Other game functions
function enterDungeon(floor) {
  showNotification(`Entered Floor ${floor}!`);
}

function trainStat(stat) {
  const char = gameState.currentCharacter;
  if (char.energy < 5) {
    showNotification("Not enough energy!");
    return;
  }
  if (char.gold < 50) {
    showNotification("Not enough gold!");
    return;
  }

  char.energy -= 5;
  char.gold -= 50;

  const statKey = stat.toLowerCase();
  if (char.stats[statKey] !== undefined) {
    char.stats[statKey] += 2;
  }
  saveCharacterData();
  loadCharacterUI();
  showNotification(`${stat} +2!`);
}

function buyItem(itemName, price) {
  const char = gameState.currentCharacter;
  if (char.gold < price) {
    showNotification("Not enough gold!");
    return;
  }
  char.gold -= price;
  // Save as object with quantity for extensibility
  let invItem = char.inventory.find((i) => i.name === itemName);
  if (invItem) {
    invItem.qty++;
  } else {
    char.inventory.push({ name: itemName, qty: 1 });
  }
  saveCharacterData();
  loadCharacterUI();
  showNotification(`Bought ${itemName}!`);

  // Check collect quests update after buying items
  checkQuestCollectItems();
}

function checkQuestCollectItems() {
  const char = gameState.currentCharacter;
  if (!char) return;

  const collectQuest = char.quests.find((q) => q.type === "collect" && !q.completed);
  if (!collectQuest) return;

  const herbs = char.inventory.find((i) => i.name.toLowerCase() === "herb");
  const qty = herbs ? herbs.qty : 0;

  collectQuest.progress = Math.min(qty, collectQuest.goal);
  if (collectQuest.progress >= collectQuest.goal) {
    collectQuest.completed = true;
    showNotification(`Quest "${collectQuest.name}" completed! Claim your reward.`);
  }

  renderQuests();
  saveCharacterData();
}

function restNow() {
  const char = gameState.currentCharacter;
  char.hp = char.maxHp;
  char.energy = char.maxEnergy;
  saveCharacterData();
  loadCharacterUI();
  showNotification("You rested and recovered!");
}

function deleteCharacter() {
  if (!confirm("Are you sure? This cannot be undone!")) return;
  delete gameState.characters[gameState.currentCharacter.name];
  gameState.users[gameState.currentUser].characters = gameState.characters;
  localStorage.setItem("users", JSON.stringify(gameState.users));
  document.getElementById("gameContainer").classList.add("hidden");
  showCharacterSelection();
}

function logout() {
  gameState.currentUser = null;
  gameState.currentCharacter = null;
  document.getElementById("gameContainer").classList.add("hidden");
  document.getElementById("charSelectContainer").classList.add("hidden");
  document.getElementById("authContainer").classList.remove("hidden");
  document.getElementById("loginForm").classList.remove("hidden");
  document.getElementById("registerForm").classList.add("hidden");
  document.getElementById("loginUsername").value = "";
  document.getElementById("loginPassword").value = "";
}

function updateTime() {
  const now = new Date();
  document.getElementById("currentTime").textContent = now.toLocaleTimeString();
}

function showError(element, message) {
  element.textContent = message;
  element.classList.remove("hidden");
}

function showNotification(message) {
  const notif = document.createElement("div");
  notif.className = "notification";
  notif.textContent = message;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

// Merit Shop Modal
const meritShopModal = document.getElementById("meritShopModal");
const meritShopBackdrop = document.getElementById("meritShopBackdrop");

function showMeritShop() {
  meritShopModal.classList.add("show");
  meritShopBackdrop.classList.add("show");

  if (gameState.currentCharacter) {
    document.getElementById("meritShopBalanceModal").textContent =
      gameState.currentCharacter.merits;
    updateMeritPurchasesModal();
  }
}

function hideMeritShop() {
  meritShopModal.classList.remove("show");
  meritShopBackdrop.classList.remove("show");
}

function regenerateStats() {
  const char = gameState.currentCharacter;
  if (!char) return;

  char.hp = Math.min(char.hp + 5, char.maxHp);
  char.energy = Math.min(char.energy + 5, char.maxEnergy);
  char.glory = Math.min(char.glory + 5, char.maxGlory);

  saveCharacterData();
  loadCharacterUI();
}

setInterval(regenerateStats, 180000);

// Level up and save
function checkLevelUp() {
  const char = gameState.currentCharacter;
  if (!char) return;
  let leveledUp = false;

  while (char.exp >= char.level * 500) {
    char.exp -= char.level * 500;
    char.level++;
    leveledUp = true;

    char.maxHp += 10;
    char.hp = char.maxHp;
    char.maxEnergy += 5;
    char.energy = char.maxEnergy;

    char.merits += 30;

    if (char.quests) {
      const levelQuest = char.quests.find((q) => q.id === 2 && !q.completed);
      if (levelQuest) {
        levelQuest.progress = char.level;
        if (levelQuest.progress >= levelQuest.goal) levelQuest.completed = true;
      }
    }
  }

  if (leveledUp) {
    showNotification(`🎉 Level UP! You reached level ${char.level} and earned 30 merits!`);
    renderQuests(); // Update quest UI for level based quest
  }

  saveCharacterData();
}

// Save character data to localStorage
function saveCharacterData() {
  if (gameState.currentUser && gameState.characters) {
    gameState.users[gameState.currentUser].characters =
      gameState.characters;
    localStorage.setItem("users", JSON.stringify(gameState.users));
  }
}

// Jewel Shop and related functions
const jewelShopModal = document.getElementById("jewelShopModal");
const jewelShopBackdrop = document.getElementById("jewelShopBackdrop");

function showJewelShop() {
  jewelShopModal.classList.add("show");
  jewelShopBackdrop.classList.add("show");

  if (gameState.currentCharacter) {
    document.getElementById("jewelShopBalanceModal").textContent =
      gameState.currentCharacter.jewels || 0;
    updateJewelPurchasesModal();
  }
}

function hideJewelShop() {
  jewelShopModal.classList.remove("show");
  jewelShopBackdrop.classList.remove("show");
}

function updateJewelPurchasesModal() {
  const char = gameState.currentCharacter;
  const container = document.getElementById("purchasedJewelItemsModal");
  if (!container) return;

  if (!char.jewelPurchases || char.jewelPurchases.length === 0) {
    container.innerHTML =
      '<div class="text-gray-400 text-sm">No items purchased yet</div>';
    return;
  }

  container.innerHTML = char.jewelPurchases
    .map(
      (item) => `
      <div class="stat-boost-item">
          <div class="flex justify-between items-center">
              <span>${item.name}</span>
              <span class="text-xs text-purple-400">✓ Applied</span>
          </div>
      </div>
  `
    )
    .join("");
}

function buyJewelItem(itemName, cost, statType, value) {
  const char = gameState.currentCharacter;
  if (!char) return;

  if (char.jewels < cost) {
    showNotification("Not enough jewels!");
    return;
  }

  // Prevent duplicate purchase of same item
  if (
    char.jewelPurchases &&
    char.jewelPurchases.some((i) => i.name === itemName)
  ) {
    showNotification("You already own this item!");
    return;
  }

  char.jewels -= cost;

  // Initialize jewel purchases array if not exists
  if (!char.jewelPurchases) {
    char.jewelPurchases = [];
  }
  char.jewelPurchases.push({ name: itemName, cost: cost });

  // Apply the effects
  if (statType === "allStats") {
    char.stats.str += value;
    char.stats.def += value;
    char.stats.spd += value;
    char.stats.eva += value;
  } else if (statType === "damageReduction") {
    // Save damage reduction as a special property
    char.damageReduction = value; // e.g. 0.2 for 20%
  } else if (statType === "spdEva") {
    char.stats.spd += value;
    char.stats.eva += value;
  } else if (statType === "jewelBoost") {
    // For boost duration in hours - save timestamp and multiplier
    char.jewelBoost = {
      multiplier: 2,
      expiresAt: Date.now() + value * 3600 * 1000,
    };
  }

  saveCharacterData();

  // Autosave on page close or refresh
  window.addEventListener("beforeunload", () => {
    saveCharacterData();
  });

  loadCharacterUI();
  updateJewelPurchasesModal();

  document.getElementById("jewelShopBalanceModal").textContent = char.jewels;

  showNotification(`💎 ${itemName} purchased for ${cost} jewels!`);
}

// Example: modify jewel gains with boost
function addJewels(amount) {
  const char = gameState.currentCharacter;
  if (!char) return;

  let finalAmount = amount;

  if (char.jewelBoost && char.jewelBoost.expiresAt > Date.now()) {
    finalAmount = amount * char.jewelBoost.multiplier;
  } else {
    // Jewel boost expired - remove it
    char.jewelBoost = null;
  }

  char.jewels += Math.floor(finalAmount);
  saveCharacterData();
  loadCharacterUI();
}

// Get effective stat including race, class, and equipment bonuses for combat etc.
function getEffectiveStat(statKey) {
  const char = gameState.currentCharacter;
  if (!char) return 0;

  let baseValue = (char.stats && char.stats[statKey]) || 0;

  // Add equipment bonuses
  if (char.equipment) {
    for (const slot in char.equipment) {
      const eq = char.equipment[slot];
      if (!eq) continue;
      // Map stat bonuses to statKey
      switch (statKey) {
        case "str":
          if (eq.strBonus) baseValue += eq.strBonus;
          break;
        case "def":
          if (eq.defBonus) baseValue += eq.defBonus;
          break;
        case "spd":
          if (eq.spdBonus) baseValue += eq.spdBonus;
          break;
        case "eva":
          if (eq.evaBonus) baseValue += eq.evaBonus;
          break;
      }
    }
  }

  return baseValue;
}

// Autosave on page close or refresh - general
window.addEventListener("beforeunload", () => {
  saveCharacterData();
});

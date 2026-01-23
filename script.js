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

// Sound effects setup (add mp3 files accordingly if possible)
const sounds = {
  attack: new Audio('attack.mp3'),
  defend: new Audio('defend.mp3'),
  skill: new Audio('skill.mp3'),
};
for (const key in sounds) {
  sounds[key].addEventListener('error', () => {
    // Ignore missing sound files gracefully
    sounds[key] = null;
  });
}

function playSound(action) {
  const sound = sounds[action];
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(() => {
      // Ignore playback error due to browser restrictions
    });
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
  document.getElementById("attackBtn").addEventListener("click", () => playerAttack());
  document.getElementById("defendBtn").addEventListener("click", playerDefend);
  document.getElementById("skillBtn").addEventListener("click", playerSkill);

  // Cancel quest button can only be attached dynamically because multiple quests
  // So attach at rendering quests
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
  const charName = prompt("Enter character name:")?.trim();
  if (!charName) return;

  if (gameState.characters[charName]) {
    alert("Character already exists");
    return;
  }

  const race = prompt("Choose race (Human/Elf/Dwarf):", "Human")?.trim() || "Human";
  const charClass = prompt("Choose class (Warrior/Mage/Rogue):", "Warrior")?.trim() || "Warrior";
  const appearance = prompt("Choose hair color (e.g. brown, black, blonde):", "brown")?.trim() || "brown";

  gameState.characters[charName] = {
    name: charName,
    race: race,
    class: charClass,
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
    stats: { str: 15, def: 12, spd: 10, eva: 8 },
    mana: 100,
    maxMana: 100,
    skillCooldown: 0,
    inventory: [],
    meritPurchases: [],
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
    ],
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
  document.getElementById(
    "charInfo"
  ).textContent = `${char.name} • ${char.race} ${char.class} • Hair: ${char.appearance}`;
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
  document.getElementById("statStr").textContent = char.stats.str;
  document.getElementById("statDef").textContent = char.stats.def;
  document.getElementById("statSpd").textContent = char.stats.spd;
  document.getElementById("statEva").textContent = char.stats.eva;
  document.getElementById("memberSince").textContent = char.createdAt;

  // Update mana display and bar (if exists in UI)
  const manaElem = document.getElementById("playerMana");
  const maxManaElem = document.getElementById("maxMana");
  const manaBar = document.getElementById("manaBar");
  if (manaElem && maxManaElem && manaBar) {
    manaElem.textContent = char.mana || 0;
    maxManaElem.textContent = char.maxMana || 0;
    manaBar.style.width = ((char.mana || 0) / (char.maxMana || 1)) * 100 + "%";
  }

  // Update training tab buttons text with current stats
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
          divs[1].textContent = `Cost: 50 Gold | Gain: +2 ${statName.toUpperCase()}\nCurrent: ${char.stats[statName]}`;
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
  } else if(statType === "expBoost" || statType === "goldBoost" || statType === "combatPower" || statType === "jewelBoost") {
    // Placeholder: you can implement timed boosts here
    showNotification(`${itemName} boost activated! (Effect not implemented)`);
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
  const tab = document.getElementById(tabName + "Tab");
  if (tab) tab.classList.remove("hidden");
  const btn = document.querySelector(`[data-tab="${tabName}"]`);
  if (btn) btn.classList.add("active");

  if (tabName === "pvp") renderPvPOpponents();
  if (tabName === "quests") renderQuests();
}

// Save character data to localStorage
function saveCharacterData() {
  if (!gameState.currentUser || !gameState.characters) return;
  gameState.users[gameState.currentUser].characters = gameState.characters;
  localStorage.setItem("users", JSON.stringify(gameState.users));
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
    const goblinQuest = char.quests.find(q => q.id === 1 && !q.completed);
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
let basePlayerAttack = function () {
  if (!gameState.turnBasedCombat.inProgress) return;

  if (!gameState.turnBasedCombat.playerTurn) {
    showNotification("Wait for your turn!");
    return;
  }

  const char = gameState.currentCharacter;
  const enemy = gameState.combatEnemy;

  // Damage calculation: random + strength
  const damage = Math.floor(Math.random() * 20) + char.stats.str;

  enemy.hp = Math.max(0, enemy.hp - damage);

  addCombatLog(`You attack for ${damage} damage!`, "success");
  updateTurnBasedCombatUI();

  playSound('attack');

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
};

let playerAttack = basePlayerAttack; // Use this by default

// Player action: Defend
function playerDefend() {
  if (!gameState.turnBasedCombat.inProgress) return;

  if (!gameState.turnBasedCombat.playerTurn) {
    showNotification("Wait for your turn!");
    return;
  }

  addCombatLog("You take a defensive stance!", "info");
  gameState.turnBasedCombat.defending = true;

  playSound('defend');

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

  // Skill does higher damage: random + 1.5 * strength
  const damage = Math.floor(Math.random() * 35) + Math.floor(1.5 * char.stats.str);

  enemy.hp = Math.max(0, enemy.hp - damage);

  addCombatLog(`You use special skill for ${damage} damage!`, "success");
  updateTurnBasedCombatUI();
  updateManaUI();

  playSound('skill');

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
      document.getElementById('skillBtn').disabled = false;
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
  if (!log) return;
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
    const herbs = char.inventory.find(i => i.name.toLowerCase() === 'herb');
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
      let extraActionBtn = "";
      if (q.id === 1 && !q.completed && !questInProgress && !activeGoblinQuestCombat) {
        extraActionBtn = `<button class="btn-primary text-xs mt-2" onclick="startGoblinQuestCombat()">Hunt a Goblin</button>`;
      }
      if (questInProgress && !q.completed) {
        cancelBtnHtml = `<button class="btn-danger text-xs mt-1" onclick="cancelQuest()">Cancel Quest</button>`;
      }
      return `
        <div class="quest-card ${q.completed ? "opacity-50" : ""}">
            <div class="font-bold text-yellow-400">${q.name}</div>
            <div class="text-xs text-gray-400 mt-2">Progress: ${q.progress}/${q.goal}</div>
            <div class="reward-badge mt-1 mb-1">Reward: ${q.rewardGold} Gold + ${q.rewardExp} EXP</div>
            ${
              q.completed
                ? `<button class="btn-success text-xs mt-1" onclick="claimQuestReward(${q.id})" ${
                    q.claimed ? 'disabled style="opacity:.5;cursor:not-allowed;"' : ""
                  }>${q.claimed ? "Reward Claimed" : "Claim Reward"}</button>`
                : questInProgress
                ? cancelBtnHtml
                : extraActionBtn
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

  char.gold += quest.rewardGold;
  char.exp += quest.rewardExp;
  quest.claimed = true;

  checkLevelUp();
  saveCharacterData();
  renderQuests();
  loadCharacterUI();

  showNotification(`Quest "${quest.name}" reward claimed! +${quest.rewardGold} Gold, +${quest.rewardExp} EXP`);
}

// Check for level up and handle it
function checkLevelUp() {
  const char = gameState.currentCharacter;
  if (!char) return;

  const expNeeded = char.level * 500;
  if (char.exp >= expNeeded) {
    char.exp -= expNeeded;
    char.level++;
    char.maxHp += 20;
    char.hp = char.maxHp;
    char.maxEnergy += 15;
    char.energy = char.maxEnergy;
    char.stats.str += 2;
    char.stats.def += 2;
    char.stats.spd += 1;
    char.stats.eva += 1;
    showNotification(`🎉 Level Up! You reached level ${char.level}!`);
  }
  saveCharacterData();
}

// Show error message in auth forms
function showError(element, message) {
  if (!element) return;
  element.textContent = message;
  element.classList.remove("hidden");
}

// General notification popup, simple implementation
function showNotification(message) {
  let notification = document.createElement("div");
  notification.className = "notification";
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.remove();
  }, 3500);
}

// --- INTEGRATED INTERACTIVE "Defeat 10 Goblins" QUEST ---

let activeGoblinQuestCombat = false;

function startGoblinQuestCombat() {
  const char = gameState.currentCharacter;
  const quest = char.quests.find(q => q.id === 1);
  if (!quest || quest.completed) {
    showNotification("No active Goblin quest.");
    return;
  }
  if (char.energy < 10) {
    showNotification("Not enough energy for goblin hunt!");
    return;
  }
  if (activeGoblinQuestCombat || gameState.turnBasedCombat.inProgress) {
    showNotification("Goblin combat already in progress!");
    return;
  }

  char.energy -= 10;
  saveCharacterData();
  loadCharacterUI();

  activeGoblinQuestCombat = true;

  // Setup goblin enemy
  gameState.combatEnemy = {
    hp: 40,
    maxHp: 40,
    name: "Goblin",
    questId: 1,
  };

  gameState.turnBasedCombat.inProgress = true;
  gameState.turnBasedCombat.playerTurn = true;
  gameState.turnBasedCombat.defending = false;

  document.getElementById("combatArea").classList.remove("hidden");
  updateTurnBasedCombatUI();
  addCombatLog("Goblin Hunt started! Defeat the goblin.", "info");
  updateCombatButtons(true);
}

function endGoblinQuestCombat(win) {
  const char = gameState.currentCharacter;
  const quest = char.quests.find(q => q.id === 1);

  activeGoblinQuestCombat = false;
  gameState.turnBasedCombat.inProgress = false;
  gameState.turnBasedCombat.defending = false;
  document.getElementById("combatArea").classList.add("hidden");
  updateCombatButtons(false);

  if (win) {
    if (quest && !quest.completed) {
      quest.progress = Math.min(quest.progress + 1, quest.goal);
      if (quest.progress >= quest.goal) {
        quest.completed = true;
        showNotification(`Quest "${quest.name}" completed! Claim your reward.`);
      }
    }
    char.gold += 100;
    char.exp += 50;
    checkLevelUp();
    addCombatLog("Goblin defeated! Quest progress updated.", "success");
    showNotification("Goblin defeated!");
  } else {
    char.hp = char.maxHp;
    addCombatLog("You were defeated by the goblin...", "danger");
    showNotification("Goblin hunt failed!");
  }
  saveCharacterData();
  loadCharacterUI();
  renderQuests();
}

// Override playerAttack to handle Goblin Quest combat special case
playerAttack = function() {
  if (!gameState.turnBasedCombat.inProgress) return;

  if (!gameState.turnBasedCombat.playerTurn) {
    showNotification("Wait for your turn!");
    return;
  }

  const char = gameState.currentCharacter;
  const enemy = gameState.combatEnemy;
  const damage = Math.floor(Math.random() * 20) + char.stats.str;

  enemy.hp = Math.max(0, enemy.hp - damage);

  addCombatLog(`You attack for ${damage} damage!`, "success");
  updateTurnBasedCombatUI();

  playSound("attack");

  if (enemy.hp <= 0) {
    if (enemy.questId === 1 && activeGoblinQuestCombat) {
      endGoblinQuestCombat(true);
    } else {
      endTurnBasedCombat(true);
    }
    return;
  }

  gameState.turnBasedCombat.playerTurn = false;
  gameState.turnBasedCombat.defending = false;
  updateCombatButtons(false);

  setTimeout(enemyTurn, 1000);
};

// Prevent endTurnBasedCombat from progressing Goblin Quest combat again
const originalEndTurnBasedCombat = endTurnBasedCombat;
endTurnBasedCombat = function(win) {
  if (activeGoblinQuestCombat) return; // ignore; handled by endGoblinQuestCombat
  originalEndTurnBasedCombat(win);
};

// Helper: updateClock
function updateTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString();
  const timeElem = document.getElementById("currentTime");
  if (timeElem) timeElem.textContent = timeString;
}


document.addEventListener('DOMContentLoaded', () => {
    // Game State
    let money = 1000;
    let currentHoe = '녹슨호미';
    let inventory = {
        '녹슨호미': 1,
        '당근': 3
    };
    let pets = [];
    let farmPlots = Array(12).fill({ crop: null, time: 0, isBig: false });
    let gameInterval;

    // DOM Elements
    const moneyEl = document.getElementById('money');
    const currentHoeEl = document.getElementById('current-hoe');
    const farmPlotsEl = document.getElementById('farm-plots');
    const seedShopEl = document.getElementById('seed-shop');
    const upgradeShopEl = document.getElementById('upgrade-shop');
    const petShopEl = document.getElementById('pet-shop');
    const sellCropsEl = document.getElementById('sell-crops');
    const hoeShopEl = document.getElementById('hoe-shop');
    const inventoryItemsEl = document.getElementById('inventory-items');
    const messageLogEl = document.getElementById('message-log');

    const farmBtn = document.getElementById('farm-btn');
    const shopBtn = document.getElementById('shop-btn');
    const inventoryBtn = document.getElementById('inventory-btn');
    const darkModeBtn = document.getElementById('dark-mode-btn');
    const resetBtn = document.getElementById('reset-btn');
    const seedShopBtn = document.getElementById('seed-shop-btn');
    const upgradeShopBtn = document.getElementById('upgrade-shop-btn');
    const petShopBtn = document.getElementById('pet-shop-btn');
    const sellCropsBtn = document.getElementById('sell-crops-btn');
    const hoeShopBtn = document.getElementById('hoe-shop-btn');

    const farmView = document.getElementById('farm-view');
    const shopView = document.getElementById('shop-view');
    const inventoryView = document.getElementById('inventory-view');

    // Game Data
    const hoes = {
        '녹슨호미': { cost: 50, upgradeChance: 0.7, next: '보통호미', bigChance: 0.02, image: 'hoe/rusty_hoe.png' },
        '보통호미': { cost: 1000, upgradeChance: 0.45, next: '철호미', bigChance: 0.3, image: 'hoe/common_hoe.png' },
        '철호미': { cost: 50000, upgradeChance: 0.01, next: '금호미', bigChance: 0.5, image: 'hoe/iron_hoe.png' },
        '금호미': { cost: 9999999, upgradeChance: 0, next: null, bigChance: 0.7, image: 'hoe/gold_hoe.png' }
    };

    const seeds = {
        '당근': { cost: 1000, time: 10, image: 'seed/dangeun.png' },
        '오이': { cost: 2500, time: 30, image: 'seed/oi.png' },
        '상추': { cost: 5000, time: 60, image: 'seed/sangchu.png' },
        '토마토': { cost: 7500, time: 120, image: 'seed/tomato.png' },
        '감자': { cost: 10000, time: 300, image: 'seed/gamja.png' },
        '배추': { cost: 12000, time: 420, image: 'seed/baechu.png' },
        '바나나': { cost: 15000, time: 3600, image: 'seed/banana.png' },
        '코코넛': { cost: 20000, time: 1800, image: 'seed/coconut.png' },
        '두리안': { cost: 40000, time: 3600, image: 'seed/durian.png' },
        '레몬': { cost: 60000, time: 7200, image: 'seed/lemon.png' },
        '다이아몬드': { cost: 100000, time: 14400, image: 'seed/diamond.png' },
        '자수정': { cost: 200000, time: 28800, image: 'seed/Gasujung.png' },
        '에그': { cost: 5000, time: 3600, image: 'pet/egg.png', isEgg: true }
    };

    const petData = {
        '치킨': { cost: 5000, bigChanceBonus: 0.05, image: 'pet/chicken.png' },
        '소': { cost: 5000, bigChanceBonus: 0.05, image: 'pet/cow.png' },
        '돼지': { cost: 5000, bigChanceBonus: 0.05, image: 'pet/pig.png' },
        '족제비': { cost: 20000, bigChanceBonus: 0.1, image: 'pet/gogebi.png' },
        '독수리': { cost: 40000, bigChanceBonus: 0.2, image: 'pet/eagle.png' },
        '드래곤': { cost: 100000, bigChanceBonus: 0.4, image: 'pet/dragon.png' }
    };

    const hoeOrder = ['녹슨호미', '보통호미', '철호미', '금호미'];

    // --- Main Game Loop ---
    function getPetBigChance() {
        return pets.reduce((total, pet) => total + (petData[pet] ? petData[pet].bigChanceBonus : 0), 0);
    }

    function saveGame() {
        const gameState = {
            money,
            currentHoe,
            inventory,
            pets,
            farmPlots,
            lastSave: Date.now()
        };
        localStorage.setItem('farmRpgState', JSON.stringify(gameState));
    }

    function hatchEgg(isOffline = false) {
        const rand = Math.random();
        let newPet;
        if (rand < 0.005) {
            newPet = '드래곤';
        } else if (rand < 0.105) {
            newPet = '독수리';
        } else if (rand < 0.255) {
            newPet = '족제비';
        } else {
            const basicPets = ['소', '치킨', '돼지'];
            newPet = basicPets[Math.floor(Math.random() * basicPets.length)];
        }
        pets.push(newPet);
        logMessage(`알에서 ${newPet}이(가) 부화했습니다!`);
        if (!isOffline) {
            updateDisplay();
        }
    }

    function loadGame() {
        const savedState = localStorage.getItem('farmRpgState');
        if (savedState) {
            const gameState = JSON.parse(savedState);
            const timeDiff = Math.floor((Date.now() - gameState.lastSave) / 1000);

            money = gameState.money;
            currentHoe = gameState.currentHoe;
            inventory = gameState.inventory; // inventory is global
            pets = gameState.pets || [];

            const newFarmPlots = gameState.farmPlots.map(plot => {
                if (plot.crop) {
                    const timeRemaining = plot.time - timeDiff;
                    if (timeRemaining <= 0) {
                        if (seeds[plot.crop].isEgg) {
                            hatchEgg(true);
                            return { crop: null, time: 0, isBig: false };
                        }
                        // Crop is ready for harvest.
                        const timeOverdue = -timeRemaining;
                        const numHarvests = Math.floor(timeOverdue / seeds[plot.crop].time) + 1;

                        // Add to inventory
                        let harvestedAmount = 0;
                        for (let i = 0; i < numHarvests; i++) {
                            let bigChance = hoes[currentHoe].bigChance + getPetBigChance();
                            let isBig = Math.random() < bigChance;
                            harvestedAmount += (isBig ? 2 : 1);
                        }
                        inventory[plot.crop] = (inventory[plot.crop] || 0) + harvestedAmount;
                        logMessage(`오프라인 중 ${plot.crop} ${harvestedAmount}개를 수확했습니다.`);

                        // Check for game clear condition
                        if (plot.crop === '바나나') {
                            logMessage('축하합니다! 마지막 농작물인 바나나를 수확했습니다! 게임 클리어!');
                        }

                        // Return an empty plot
                        return { crop: null, time: 0, isBig: false };
                    } else {
                        // Crop still growing
                        return { crop: plot.crop, time: timeRemaining, isBig: plot.isBig };
                    }
                }
                return plot; // Empty plot remains empty
            });
            farmPlots = newFarmPlots; // Assign the newly calculated plots

            logMessage('저장된 게임을 불러왔습니다.');
        } else {
            logMessage('새로운 게임을 시작합니다.');
        }
    }

    function resetGame() {
        if (confirm('정말로 게임을 초기화하시겠습니까?')) {
            localStorage.removeItem('farmRpgState');
            money = 1000;
            currentHoe = '녹슨호미';
            inventory = {
                '녹슨호미': 1,
                '당근': 3
            };
            pets = [];
            farmPlots = Array(12).fill({ crop: null, time: 0, isBig: false });
            updateDisplay();
            location.reload();
        }
    }

    function updateGame() {
        // Grow crops
        farmPlots.forEach((plot, index) => {
            if (plot.crop && plot.time > 0) {
                plot.time--;
                if (plot.time === 0) {
                    harvest(index, true); // Auto-harvest
                }
            }
        });

        // Enemy appearance
        if (Math.random() < 0.0005) {
            const enemy = Math.random() < 0.5 ? '멧돼지' : '고라니';
            logMessage(`${enemy}(이)가 나타나 농작물을 망쳤습니다!`);
            farmPlots.forEach(plot => {
                if (plot.crop) {
                    plot.time = seeds[plot.crop].time;
                }
            });
        }

        updateDisplay();
        saveGame();
    }

    function formatTime(seconds) {
        if (seconds > 3600) {
            return `${Math.ceil(seconds / 3600)}시간`;
        } else if (seconds > 60) {
            return `${Math.ceil(seconds / 60)}분`;
        } else {
            return `${seconds}초`;
        }
    }

    // --- Rendering Functions ---
    function updateDisplay() {
        moneyEl.textContent = money;
        currentHoeEl.innerHTML = `<img src="${hoes[currentHoe].image}" alt="${currentHoe}" class="inline-img" /> ${currentHoe}`;
        renderFarm();
        renderShop();
        renderInventory();
    }

    function renderFarm() {
        farmPlotsEl.innerHTML = '';
        farmPlots.forEach((plot, index) => {
            const plotEl = document.createElement('div');
            plotEl.classList.add('plot');
            if (plot.isBig) {
                plotEl.classList.add('big-plant');
            }
            if (plot.crop) {
                plotEl.innerHTML = `<img src="${seeds[plot.crop].image}" alt="${plot.crop}" /><p>${formatTime(plot.time)}</p>`;
            } else {
                plotEl.textContent = '빈 땅';
                plotEl.onclick = () => plant(index);
            }
            farmPlotsEl.appendChild(plotEl);
        });
    }

    function renderShop() {
        // Seed Shop
        seedShopEl.innerHTML = '';
        const eggItemContainer = document.createElement('div');
        const otherSeedsContainer = document.createElement('div');
        otherSeedsContainer.style.maxHeight = '240px';
        otherSeedsContainer.style.overflowY = 'auto';
        otherSeedsContainer.style.display = 'flex';
        otherSeedsContainer.style.flexWrap = 'wrap';
        otherSeedsContainer.style.gap = '10px';
        otherSeedsContainer.style.width = '100%';


        for (const seed in seeds) {
            const seedItem = document.createElement('div');
            seedItem.classList.add('seed-item');
            seedItem.innerHTML = `<img src="${seeds[seed].image}" alt="${seed}" /><p>${seed}</p><p>가격: ${seeds[seed].cost}원</p>`;
            seedItem.onclick = () => buySeed(seed);

            if (seed === '에그') {
                eggItemContainer.appendChild(seedItem);
            } else {
                otherSeedsContainer.appendChild(seedItem);
            }
        }
        seedShopEl.appendChild(eggItemContainer);
        seedShopEl.appendChild(otherSeedsContainer);

        // Upgrade Shop
        upgradeShopEl.innerHTML = '';
        const currentHoeInfo = hoes[currentHoe];
        if (currentHoeInfo.next) {
            const nextHoe = currentHoeInfo.next;
            const upgradeItem = document.createElement('div');
            upgradeItem.classList.add('upgrade-item');
            upgradeItem.innerHTML = `<img src="${hoes[nextHoe].image}" alt="${nextHoe}" />
                                     <p>${currentHoe} 2개가 필요합니다</p>
                                     <button id="upgrade-btn">강화</button>`;
            upgradeShopEl.appendChild(upgradeItem);
            document.getElementById('upgrade-btn').onclick = () => upgradeHoe();
        }

        // Pet Shop
        petShopEl.innerHTML = '';
        for (const pet in petData) {
            const petItem = document.createElement('div');
            petItem.classList.add('seed-item'); // Re-use styling
            petItem.innerHTML = `<img src="${petData[pet].image}" alt="${pet}" /><p>${pet}</p><p>가격: ${petData[pet].cost}원</p>`;
            petItem.onclick = () => buyPet(pet);
            petShopEl.appendChild(petItem);
        }

        // Hoe Shop
        renderHoeShop();

        // Sell Crops
        renderSellCrops();
    }

    function renderHoeShop() {
        hoeShopEl.innerHTML = '';
        for (const hoe in hoes) {
            const hoeItem = document.createElement('div');
            hoeItem.classList.add('seed-item'); // Re-use styling
            hoeItem.innerHTML = `<img src="${hoes[hoe].image}" alt="${hoe}" /><p>${hoe}</p><p>가격: ${hoes[hoe].cost}원</p>`;
            hoeItem.onclick = () => buyHoe(hoe);
            hoeShopEl.appendChild(hoeItem);
        }
    }

    function renderSellCrops() {
        sellCropsEl.innerHTML = '';
        for (const item in inventory) {
            if (seeds[item]) { // If the item is a crop
                const cropItem = document.createElement('div');
                cropItem.classList.add('seed-item'); // Re-use styling
                const sellPrice = seeds[item].cost * 1.2;
                cropItem.innerHTML = `<img src="${seeds[item].image}" alt="${item}" /><p>${item}</p><p>수량: ${inventory[item]}</p><p>판매가: ${sellPrice.toFixed(0)}원</p>`;
                cropItem.onclick = () => sellCrop(item);
                sellCropsEl.appendChild(cropItem);
            }
        }
    }

    function renderInventory() {
        inventoryItemsEl.innerHTML = '';
        for (const item in inventory) {
            const invItem = document.createElement('div');
            invItem.classList.add('inventory-item');
            let imageSrc = '';
            if(hoes[item]) imageSrc = hoes[item].image;
            if(seeds[item]) imageSrc = seeds[item].image;

            invItem.innerHTML = `<img src="${imageSrc}" alt="${item}" /><p>${item}: ${inventory[item]}개</p>`;
            inventoryItemsEl.appendChild(invItem);
        }
        pets.forEach(pet => {
            const petInv = document.createElement('div');
            petInv.classList.add('inventory-item');
            petInv.innerHTML = `<img src="${petData[pet].image}" alt="${pet}" /><p>${pet}</p>`;
            inventoryItemsEl.appendChild(petInv);
        });
    }

    // --- Game Actions ---
    function plant(index) {
        const modal = createPlantingModal(index);
        document.body.appendChild(modal);
    }

    function createPlantingModal(index) {
        const modal = document.createElement('div');
        modal.classList.add('modal');

        const modalContent = document.createElement('div');
        modalContent.classList.add('modal-content');

        const closeBtn = document.createElement('span');
        closeBtn.classList.add('close');
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => modal.remove();
        modalContent.appendChild(closeBtn);

        for (const seed in inventory) {
            if (seeds[seed] && inventory[seed] > 0) {
                const seedItem = document.createElement('div');
                seedItem.classList.add('plant-modal-item');

                const seedInfo = document.createElement('span');
                seedInfo.innerHTML = `<img src="${seeds[seed].image}" alt="${seed}" /> ${seed} (${inventory[seed]})`;
                seedItem.appendChild(seedInfo);

                const selectButton = document.createElement('button');
                selectButton.textContent = '선택';
                selectButton.onclick = () => {
                    inventory[seed]--;
                    let isBig = false;
                    if (!seeds[seed].isEgg) {
                        let bigChance = hoes[currentHoe].bigChance + getPetBigChance();
                        isBig = Math.random() < bigChance;
                    }
                    farmPlots[index] = { crop: seed, time: seeds[seed].time, isBig: isBig };
                    logMessage(`${seed}을(를) 심었습니다.`);
                    modal.remove();
                    updateDisplay();
                };
                seedItem.appendChild(selectButton);

                modalContent.appendChild(seedItem);
            }
        }

        modal.appendChild(modalContent);
        return modal;
    }

    function harvest(index, isAuto = false, isOffline = false) {
        const plot = farmPlots[index];
        if (!plot.crop) return;

        if (seeds[plot.crop].isEgg) {
            hatchEgg(isOffline);
            farmPlots[index] = { crop: null, time: 0, isBig: false };
            if(!isOffline) updateDisplay();
            return;
        }

        let harvestedAmount = plot.isBig ? 2 : 1;

        if (isAuto) {
            inventory[plot.crop] = (inventory[plot.crop] || 0) + harvestedAmount;
            if(!isOffline) logMessage(`${plot.crop}을(를) 자동으로 수확했습니다.` + (plot.isBig ? ' (BIG!)' : ''));
        } else { // Manual harvest logic (if you want to re-introduce it)
            let sellPrice = seeds[plot.crop].cost * 0.9 * harvestedAmount;
            logMessage(`${plot.crop}을(를) 수확하여 ${sellPrice.toFixed(0)}원을 얻었습니다.` + (plot.isBig ? ' (BIG!)' : ''));
            money += sellPrice;
        }

        farmPlots[index] = { crop: null, time: 0, isBig: false };

        if (plot.crop === '바나나') {
            logMessage('축하합니다! 마지막 농작물인 바나나를 수확했습니다! 게임 클리어!');
            const clearSound = new Audio('clear.mp3');
            clearSound.play();
            
            clearInterval(gameInterval);
            document.getElementById('game-container').style.display = 'none';
            const clearScreen = document.getElementById('game-clear-screen');
            clearScreen.style.display = 'flex';
        }

        if(!isOffline) updateDisplay();
    }

    function buySeed(seed) {
        if (money >= seeds[seed].cost) {
            money -= seeds[seed].cost;
            inventory[seed] = (inventory[seed] || 0) + 1;
            logMessage(`${seed} 씨앗을 구매했습니다.`);
            updateDisplay();
        } else {
            logMessage('돈이 부족합니다.');
        }
    }

    function buyHoe(hoe) {
        if (money >= hoes[hoe].cost) {
            money -= hoes[hoe].cost;
            inventory[hoe] = (inventory[hoe] || 0) + 1;
            logMessage(`${hoe}을(를) 구매했습니다.`);
            if (hoeOrder.indexOf(hoe) > hoeOrder.indexOf(currentHoe)) {
                currentHoe = hoe;
                logMessage(`${hoe}으로 교체되었습니다.`);
            }
            updateDisplay();
        } else {
            logMessage('돈이 부족합니다.');
        }
    }

    function buyPet(pet) {
        if (money >= petData[pet].cost) {
            if (pets.includes(pet)) {
                logMessage('이미 가지고 있는 펫입니다.');
                return;
            }
            money -= petData[pet].cost;
            pets.push(pet);
            logMessage(`${pet}을(를) 구매했습니다.`);
            updateDisplay();
        } else {
            logMessage('돈이 부족합니다.');
        }
    }

    function sellCrop(crop) {
        if (inventory[crop] > 0) {
            let sellPrice = seeds[crop].cost * 1.2;
            let bigChance = hoes[currentHoe].bigChance + getPetBigChance();
            if (Math.random() < bigChance) {
                sellPrice *= 2;
                logMessage('BIG 효과! 판매가가 2배가 되었습니다.');
            }
            money += sellPrice;
            inventory[crop]--;
            logMessage(`${crop}을(를) 판매하여 ${sellPrice.toFixed(0)}원을 얻었습니다.`);
            updateDisplay();
        } else {
            logMessage('판매할 작물이 없습니다.');
        }
    }

    function upgradeHoe() {
        const currentHoeInfo = hoes[currentHoe];
        if (inventory[currentHoe] >= 2) {
            inventory[currentHoe] -= 2;
            if (Math.random() < currentHoeInfo.upgradeChance) {
                currentHoe = currentHoeInfo.next;
                inventory[currentHoe] = (inventory[currentHoe] || 0) + 1;
                logMessage(`호미 강화에 성공하여 ${currentHoe}을(를) 획득했습니다!`);
            } else {
                logMessage('호미 강화에 실패했습니다...');
            }
            updateDisplay();
        } else {
            logMessage(`${currentHoe}이(가) 부족합니다.`);
        }
    }

    // --- UI Navigation ---
    farmBtn.onclick = () => switchView('farm-view');
    shopBtn.onclick = () => switchView('shop-view');
    inventoryBtn.onclick = () => switchView('inventory-view');
    darkModeBtn.onclick = () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    };
    resetBtn.onclick = () => resetGame();
    seedShopBtn.onclick = () => switchShopView('seed-shop');
    upgradeShopBtn.onclick = () => switchShopView('upgrade-shop');
    petShopBtn.onclick = () => switchShopView('pet-shop');
    sellCropsBtn.onclick = () => switchShopView('sell-crops');
    hoeShopBtn.onclick = () => switchShopView('hoe-shop');

    function switchView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
        document.getElementById(viewId).classList.add('active-view');
    }

    function switchShopView(shopPageId) {
        document.querySelectorAll('.shop-page').forEach(p => p.style.display = 'none');
        document.getElementById(shopPageId).style.display = 'flex';
    }

    function logMessage(msg) {
        const p = document.createElement('p');
        p.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        messageLogEl.prepend(p);
    }

    // Initial setup
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }
    loadGame();
    switchView('farm-view');
    switchShopView('seed-shop');
    updateDisplay();
    gameInterval = setInterval(updateGame, 1000);
});
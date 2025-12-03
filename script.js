document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const fetchBtn = document.getElementById('fetch-btn');
    const fileInput = document.getElementById('file-input');
    const statusMsg = document.getElementById('status-msg');
    const daySelectContainer = document.getElementById('day-select-container');
    const daySelect = document.getElementById('day-select');
    const spinBtn = document.getElementById('spin-btn');
    const canvas = document.getElementById('wheel-canvas');
    const ctx = canvas.getContext('2d');
    const winnerDisplay = document.getElementById('winner-display');
    const winnerName = document.getElementById('winner-name');
    const closeWinnerBtn = document.getElementById('close-winner-btn');
    const entrantsContainer = document.getElementById('entrants-container');
    const entrantsTableBody = document.querySelector('#entrants-table tbody');
    const entrantCount = document.getElementById('entrant-count');
    const copyBtn = document.getElementById('copy-btn');
    const wheelPointer = document.querySelector('.wheel-pointer');

    // Initial State
    toggleWheelControls(false);

    // State
    let leaderboardData = null;
    let currentEntries = [];
    let currentRotation = 0;
    let isSpinning = false;

    // Constants
    const COLORS = [
        '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', 
        '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'
    ];

    // Event Listeners
    fetchBtn.addEventListener('click', handleFetchLeaderboard);
    fileInput.addEventListener('change', handleFileUpload);
    daySelect.addEventListener('change', handleDaySelect);
    spinBtn.addEventListener('click', spinWheel);
    closeWinnerBtn.addEventListener('click', () => {
        winnerDisplay.classList.remove('visible');
        winnerDisplay.classList.add('hidden');
        spinBtn.disabled = false;
    });
    copyBtn.addEventListener('click', copyEntrantsToClipboard);

    // Fetch Handler
    async function handleFetchLeaderboard() {
        fetchBtn.disabled = true;
        statusMsg.textContent = 'Fetching...';
        statusMsg.className = 'status-msg';

        try {
            const response = await fetch('/api/leaderboard');
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to fetch');
            }
            
            leaderboardData = await response.json();
            console.log("Leaderboard loaded:", leaderboardData);
            
            statusMsg.textContent = 'Loaded!';
            statusMsg.classList.add('success');
            
            populateDaySelect();
            daySelectContainer.style.display = 'flex';
            resetWheel();
        } catch (error) {
            console.error(error);
            statusMsg.textContent = 'Error: ' + error.message;
            statusMsg.classList.add('error');
        } finally {
            fetchBtn.disabled = false;
        }
    }

    // File Upload Handler
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        statusMsg.textContent = 'Loading file...';
        statusMsg.className = 'status-msg';

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                leaderboardData = JSON.parse(e.target.result);
                console.log("Leaderboard loaded from file:", leaderboardData);
                
                statusMsg.textContent = 'File Loaded!';
                statusMsg.classList.add('success');

                populateDaySelect();
                daySelectContainer.style.display = 'flex';
                resetWheel();
            } catch (error) {
                alert('Error parsing JSON file.');
                console.error(error);
                statusMsg.textContent = 'Error parsing file';
                statusMsg.classList.add('error');
            }
        };
        reader.readAsText(file);
    }

    // Populate Day Selector
    function populateDaySelect() {
        daySelect.innerHTML = '<option value="" disabled selected>Choose a day...</option>';
        
        // Find all days present in the data
        const days = new Set();
        Object.values(leaderboardData.members).forEach(member => {
            if (member.completion_day_level) {
                Object.keys(member.completion_day_level).forEach(day => {
                    days.add(parseInt(day));
                });
            }
        });

        const sortedDays = Array.from(days).sort((a, b) => a - b);

        sortedDays.forEach(day => {
            const option = document.createElement('option');
            option.value = day;
            option.textContent = `Day ${day}`;
            daySelect.appendChild(option);
        });
    }

    // Handle Day Selection
    function handleDaySelect() {
        const selectedDay = daySelect.value;
        if (!selectedDay) return;

        calculateEntries(selectedDay);
        drawWheel();
        spinBtn.disabled = currentEntries.length === 0;
        winnerDisplay.classList.add('hidden');
        winnerDisplay.classList.remove('visible');
    }

    // Calculate Entries
    function calculateEntries(day) {
        currentEntries = [];
        const entrantMap = new Map(); // Track stars per person for the table
        
        Object.values(leaderboardData.members).forEach(member => {
            // Ensure completion_day_level exists and has the day key
            if (member.completion_day_level && member.completion_day_level[day]) {
                const stars = Object.keys(member.completion_day_level[day]).length; // 1 or 2
                
                // Double check star count is valid (> 0)
                if (stars > 0) {
                    const name = member.name || `(Anon #${member.id})`;
                    entrantMap.set(name, stars);

                    // Give 1 entry per star
                    for (let i = 0; i < stars; i++) {
                        currentEntries.push({
                            name: name,
                            color: COLORS[currentEntries.length % COLORS.length]
                        });
                    }
                }
            }
        });

        // Shuffle entries for better distribution
        shuffleArray(currentEntries);
        console.log(`Day ${day}: ${currentEntries.length} entries generated.`);
        
        updateEntrantsTable(entrantMap);
        toggleWheelControls(currentEntries.length > 0);
    }

    function updateEntrantsTable(entrantMap) {
        entrantsTableBody.innerHTML = '';
        entrantCount.textContent = entrantMap.size;
        entrantsContainer.style.display = 'flex';

        // Sort by stars (desc), then name (asc)
        const sortedEntrants = Array.from(entrantMap.entries()).sort((a, b) => {
            if (b[1] !== a[1]) return b[1] - a[1];
            return a[0].localeCompare(b[0]);
        });

        sortedEntrants.forEach(([name, stars]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${name}</td>
                <td>${'⭐'.repeat(stars)}</td>
            `;
            entrantsTableBody.appendChild(row);
        });
    }

    function toggleWheelControls(visible) {
        if (visible) {
            spinBtn.style.display = 'block';
            wheelPointer.style.display = 'block';
            spinBtn.disabled = false;
        } else {
            spinBtn.style.display = 'none';
            wheelPointer.style.display = 'none';
            spinBtn.disabled = true;
        }
    }

    function copyEntrantsToClipboard() {
        const rows = Array.from(document.querySelectorAll('#entrants-table tbody tr'));
        if (rows.length === 0) return;

        // Extract names
        const names = rows.map(row => row.cells[0].textContent);

        // Sort alphabetically
        names.sort((a, b) => a.localeCompare(b));

        // Get selected day
        const day = document.getElementById('day-select').value;

        // Format output
        const text = `Day ${day} Entrants (${names.length}):\n\n` + names.join(', ');

        navigator.clipboard.writeText(text).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✅';
            setTimeout(() => copyBtn.textContent = originalText, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    }

    // Fisher-Yates Shuffle
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // Draw Wheel
    function drawWheel() {
        if (currentEntries.length === 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = canvas.width / 2 - 10;
        const arc = (2 * Math.PI) / currentEntries.length;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(currentRotation);

        currentEntries.forEach((entry, i) => {
            const angle = i * arc;
            
            // Slice
            ctx.beginPath();
            ctx.fillStyle = entry.color;
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radius, angle, angle + arc);
            ctx.lineTo(0, 0);
            ctx.fill();
            ctx.stroke();

            // Text
            ctx.save();
            ctx.translate(Math.cos(angle + arc / 2) * (radius * 0.75), Math.sin(angle + arc / 2) * (radius * 0.75));
            ctx.rotate(angle + arc / 2);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Inter';
            ctx.textAlign = 'right';
            ctx.fillText(entry.name, 0, 5);
            ctx.restore();
        });

        ctx.restore();
    }

    // Spin Wheel
    function spinWheel() {
        if (isSpinning || currentEntries.length === 0) return;

        isSpinning = true;
        spinBtn.disabled = true;
        winnerDisplay.classList.add('hidden');
        winnerDisplay.classList.remove('visible');

        // Random spin duration between 3-5 seconds
        const duration = 3000 + Math.random() * 2000; 
        // Random extra rotations (5-10)
        const extraRotations = (5 + Math.random() * 5) * 2 * Math.PI;
        
        const startRotation = currentRotation;
        const targetRotation = startRotation + extraRotations + Math.random() * 2 * Math.PI;
        
        const startTime = performance.now();

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);
            
            currentRotation = startRotation + (targetRotation - startRotation) * ease;
            
            drawWheel();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                isSpinning = false;
                spinBtn.disabled = false;
                determineWinner(targetRotation);
            }
        }

        requestAnimationFrame(animate);
    }

    // Determine Winner
    function determineWinner(finalRotation) {
        // Normalize rotation to 0-2PI
        const normalizedRotation = finalRotation % (2 * Math.PI);
        
        // The pointer is at the top (3PI/2 or -PI/2 in canvas coords, but we rotated the context)
        // Actually, we drew the wheel starting at 0 (right).
        // Pointer is at top (270 degrees or 3PI/2).
        // To find the slice under the pointer, we need to consider the rotation.
        // The wheel rotated clockwise by `normalizedRotation`.
        // So the slice at the top is the one that WAS at (3PI/2 - normalizedRotation).
        
        const arc = (2 * Math.PI) / currentEntries.length;
        
        // Calculate angle of the pointer relative to the wheel's 0
        let pointerAngle = (3 * Math.PI / 2) - normalizedRotation;
        
        // Normalize pointer angle to 0-2PI
        while (pointerAngle < 0) pointerAngle += 2 * Math.PI;
        pointerAngle %= (2 * Math.PI);

        const winningIndex = Math.floor(pointerAngle / arc);
        const winner = currentEntries[winningIndex];

        showWinner(winner);
    }

    function showWinner(winner) {
        winnerName.textContent = winner.name;
        winnerDisplay.classList.remove('hidden');
        // Trigger reflow
        void winnerDisplay.offsetWidth; 
        winnerDisplay.classList.add('visible');
        
        // Confetti effect could go here
        console.log("Winner:", winner);
    }

    function resetWheel() {
        currentEntries = [];
        currentRotation = 0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        toggleWheelControls(false);
        winnerDisplay.classList.add('hidden');
    }
});

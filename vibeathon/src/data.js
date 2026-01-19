const CONFIG = {
    MAX_PLAYERS: 2, // Toggle to 3 or 4 to enable Interns
    TILE_SIZE: 48,
    MAP_WIDTH: 20,
    MAP_HEIGHT: 15,
    DEBUG: false
};

const BLOCK_TYPES = {
    PYTHON: { color: '#306998', label: 'PY' }, // blue
    MATH: { color: '#ff0000', label: '1+1' },   // red
    LOGIC: { color: '#ffff00', label: 'IF' },   // yellow
    PHYSICS: { color: '#9b59b6', label: 'E=mc' }, // purple
    COFFEE: { color: '#795548', label: '☕' }    // brown
};

const QUESTIONS = [
    // --- SUPER EASY PYTHON QUESTIONS ---
    {
        id: 'py_001',
        type: 'PYTHON',
        category: 'Basic',
        text: 'What is 2 + 3?',
        options: ['5', '6', '23', '4'],
        answer: '5',
        blocks: ['PYTHON'],
        time: 60
    },
    {
        id: 'py_002',
        type: 'PYTHON',
        category: 'Basic',
        text: 'What is 10 - 5?',
        options: ['5', '15', '2', '50'],
        answer: '5',
        blocks: ['PYTHON'],
        time: 60
    },
    {
        id: 'py_003',
        type: 'PYTHON',
        category: 'Basic',
        text: 'What is 3 * 2?',
        options: ['6', '5', '8', '32'],
        answer: '6',
        blocks: ['PYTHON'],
        time: 60
    },
    {
        id: 'py_004',
        type: 'PYTHON',
        category: 'Basic',
        text: 'print("Hello")\nWhat does this show?',
        options: ['Hello', 'print', 'Error', 'Nothing'],
        answer: 'Hello',
        blocks: ['PYTHON'],
        time: 60
    },
    {
        id: 'py_005',
        type: 'PYTHON',
        category: 'Basic',
        text: 'x = 5\nWhat is x?',
        options: ['5', 'x', 'Error', '0'],
        answer: '5',
        blocks: ['PYTHON'],
        time: 60
    },

    // --- EASY MATH ---
    {
        id: 'math_001',
        type: 'MATH',
        text: '1 + 1 = ?',
        options: ['2', '11', '0', '3'],
        answer: '2',
        blocks: ['MATH'],
        time: 60
    },
    {
        id: 'math_002',
        type: 'MATH',
        text: '5 + 5 = ?',
        options: ['10', '55', '0', '15'],
        answer: '10',
        blocks: ['MATH'],
        time: 60
    },
    {
        id: 'math_003',
        type: 'MATH',
        text: '10 - 3 = ?',
        options: ['7', '13', '3', '10'],
        answer: '7',
        blocks: ['MATH'],
        time: 60
    },

    // --- EASY LOGIC ---
    {
        id: 'logic_001',
        type: 'LOGIC',
        text: 'Is the sky blue?',
        options: ['Yes', 'No', 'Maybe', 'Sometimes'],
        answer: 'Yes',
        blocks: ['LOGIC'],
        time: 60
    },
    {
        id: 'logic_002',
        type: 'LOGIC',
        text: 'Do cats bark?',
        options: ['No', 'Yes', 'Maybe', 'Always'],
        answer: 'No',
        blocks: ['LOGIC'],
        time: 60
    },

    // --- EASY COMMON SENSE ---
    {
        id: 'common_001',
        type: 'COMMON',
        text: 'What color is grass?',
        options: ['Green', 'Blue', 'Red', 'Yellow'],
        answer: 'Green',
        blocks: ['LOGIC'],
        time: 60
    },
    {
        id: 'common_002',
        type: 'COMMON',
        text: 'How many legs does a dog have?',
        options: ['4', '2', '6', '8'],
        answer: '4',
        blocks: ['LOGIC'],
        time: 60
    }
];

const CHAOS_EVENTS = [
    { id: 'REVERSE', name: 'REVERSE CONTROLS', duration: 8000 },
    { id: 'SPEED', name: 'DEADLINE PANIC (2x TIME)', duration: 7000 },
    { id: 'SLOW', name: 'MEMORY LEAK (SLOW)', duration: 10000 },
    { id: 'BLIND', name: 'STACK OVERFLOW (BLOCKED VIEW)', duration: 5000 }
];

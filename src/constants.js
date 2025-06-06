export const DEFAULT_OUTPUT = "repostruc-output.txt";
export const CONFIG_FILE = ".repostrucrc.json";

// Default patterns that are always ignored unless --no-default-patterns is used
export const DEFAULT_IGNORE = [
    "node_modules/**",
    ".git/**",
    "dist/**",
    "build/**",
    "*.log",
    ".DS_Store",
    "coverage/**",
    ".next/**",
    ".cache/**",
    "*.tmp",
    "*.temp",
    "*.swp",
    "*.swo",
    "Thumbs.db",
    ".vscode/**",
    ".idea/**",
    "*.sublime-*",
    ".env*",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    ".nyc_output/**",
    ".pytest_cache/**",
    "__pycache__/**",
    "*.pyc",
    ".mypy_cache/**",
    ".tox/**",
    "venv/**",
    "env/**",
    ".virtualenv/**",
    "target/**",
    "out/**",
    "bin/**",
    "obj/**",
    ".gradle/**",
    ".mvn/**",
    "*.class",
    "*.jar",
    "*.war",
    "*.ear"
];

// File type categories for better organization
export const FILE_CATEGORIES = {
    code: ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.go', '.rs', '.php', '.rb', '.swift', '.kt'],
    web: ['.html', '.css', '.scss', '.sass', '.less'],
    data: ['.json', '.xml', '.yaml', '.yml', '.toml', '.csv'],
    docs: ['.md', '.txt', '.rst', '.tex', '.doc', '.docx', '.pdf'],
    config: ['.config', '.conf', '.ini', '.cfg', '.rc'],
    image: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico'],
    media: ['.mp4', '.mp3', '.wav', '.avi', '.mov', '.webm'],
    archive: ['.zip', '.tar', '.gz', '.rar', '.7z', '.bz2']
};

// Tree drawing characters
export const TREE_CHARS = {
    INDENT: "  ",
    BRANCH: "├── ",
    LAST_BRANCH: "└── ",
    PIPE: "│   ",
    SPACE: "    "
};

// Git status mappings
export const GIT_STATUS_MAP = {
    'M ': 'modified',
    'MM': 'modified',
    'A ': 'added',
    'AM': 'added',
    'D ': 'deleted',
    'R ': 'renamed',
    'C ': 'copied',
    '??': 'untracked',
    '!!': 'ignored'
};

// Default configuration
export const DEFAULT_CONFIG = {
    output: "repostruc-output.txt",
    stats: false,
    files: false,
    sizes: false,
    gitignore: true,
    hidden: false,
    depth: null,
    format: "txt",
    groupByType: false,
    timestamps: false,
    permissions: false,
    excludeEmpty: false,
    followSymlinks: false,
    gitStatus: false,
    color: true,
    ignore: [],
    include: [],
    noDefaultPatterns: false
};
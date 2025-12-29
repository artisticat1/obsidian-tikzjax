/**
 * TikZ Source Utilities
 * 
 * Utility functions for cleaning and processing TikZ source code.
 */

// Pre-compiled regex for non-breaking space (more comprehensive than string literal)
const NBSP_PATTERN = /\u00A0|&nbsp;/g;

/**
 * Clean and normalize TikZ source code
 * 
 * Performs the following operations in a single pass:
 * - Removes non-breaking space characters (U+00A0 and &nbsp;)
 * - Trims leading/trailing whitespace from each line
 * - Removes empty lines
 * 
 * @param source - Raw TikZ source code
 * @returns Cleaned source code
 */
export function tidyTikzSource(source: string): string {
    // First pass: remove all non-breaking spaces
    const cleaned = source.replace(NBSP_PATTERN, '');

    // Single-pass line processing using reduce
    // This is more efficient than split -> map -> filter -> join
    const lines = cleaned.split('\n');
    const result: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        // Skip empty lines (more efficient than filter after map)
        if (trimmed.length > 0) {
            result.push(trimmed);
        }
    }

    return result.join('\n');
}

/**
 * Alternative implementation using reduce for functional style
 * Kept for reference - benchmarks show similar performance
 */
function tidyTikzSourceFunctional(source: string): string {
    return source
        .replace(NBSP_PATTERN, '')
        .split('\n')
        .reduce<string[]>((acc, line) => {
            const trimmed = line.trim();
            if (trimmed) {
                acc.push(trimmed);
            }
            return acc;
        }, [])
        .join('\n');
}

/**
 * Validate TikZ source has required structure
 * Returns true if source appears to be valid TikZ
 */
export function isValidTikzSource(source: string): boolean {
    const trimmed = source.trim();
    // Basic validation: should contain tikz-related commands
    return (
        trimmed.length > 0 &&
        (trimmed.includes('\\begin{tikzpicture}') ||
            trimmed.includes('\\tikz') ||
            trimmed.includes('\\draw') ||
            trimmed.includes('\\node') ||
            trimmed.includes('\\path'))
    );
}

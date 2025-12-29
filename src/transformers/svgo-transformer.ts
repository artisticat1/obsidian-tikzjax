/**
 * SVGO Optimization Transformer
 * 
 * Optimizes SVG using SVGO library to fix rendering issues
 * (especially misaligned text nodes on mobile devices).
 */

import type { SvgTransformer, TransformContext, TransformResult } from './types';
import { optimize } from '../../svgo.browser';

// SVGO configuration - static constant to avoid recreation
const SVGO_CONFIG = {
    plugins: [
        {
            name: 'preset-default',
            params: {
                overrides: {
                    // Don't use the "cleanupIDs" plugin
                    // To avoid problems with duplicate IDs ("a", "b", ...)
                    // when inlining multiple SVGs with IDs
                    cleanupIDs: false,
                },
            },
        },
    ],
} as const;

/**
 * Check if requestIdleCallback is available
 */
const hasIdleCallback = typeof window !== 'undefined' && 'requestIdleCallback' in window;

/**
 * Schedule a task during browser idle time or via setTimeout fallback
 */
function scheduleIdleTask<T>(task: () => T, timeout = 100): Promise<T> {
    return new Promise((resolve, reject) => {
        const execute = () => {
            try {
                resolve(task());
            } catch (error) {
                reject(error);
            }
        };

        if (hasIdleCallback) {
            (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
                .requestIdleCallback(execute, { timeout });
        } else {
            setTimeout(execute, 0);
        }
    });
}

/**
 * Transformer that optimizes SVG using SVGO
 * Runs asynchronously to avoid blocking the main thread
 */
export class SvgoOptimizationTransformer implements SvgTransformer {
    readonly name = 'svgo-optimization';
    readonly priority = 50; // Run in middle of pipeline
    enabled = true;

    private readonly asyncTimeout: number;

    constructor(asyncTimeout = 100) {
        this.asyncTimeout = asyncTimeout;
    }

    async transform(ctx: TransformContext): Promise<TransformResult> {
        if (!this.enabled) {
            return { svg: ctx.svg, modified: false };
        }

        try {
            const optimized = await scheduleIdleTask(() => {
                // @ts-ignore - SVGO type definitions are incomplete
                return optimize(ctx.svg, SVGO_CONFIG).data as string;
            }, this.asyncTimeout);

            return {
                svg: optimized,
                modified: optimized !== ctx.svg,
            };
        } catch (error) {
            console.error('TikZJax: SVGO optimization failed', error);
            // Return original SVG on failure (graceful degradation)
            return { svg: ctx.svg, modified: false };
        }
    }
}

/**
 * Factory function for creating SvgoOptimizationTransformer
 */
export function createSvgoTransformer(asyncTimeout = 100): SvgoOptimizationTransformer {
    return new SvgoOptimizationTransformer(asyncTimeout);
}

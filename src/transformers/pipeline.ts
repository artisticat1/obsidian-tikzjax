/**
 * SVG Processing Pipeline
 * 
 * A composable pipeline for processing SVG content through
 * multiple transformers. Supports both sync and async transformers.
 */

import type {
    SvgTransformer,
    TransformContext,
    PipelineConfig,
} from './types';
import { DEFAULT_PIPELINE_CONFIG } from './types';

/**
 * SVG Processing Pipeline
 * Manages a collection of transformers and executes them in order
 */
export class SvgPipeline {
    private transformers: SvgTransformer[] = [];
    private readonly config: PipelineConfig;

    constructor(config: Partial<PipelineConfig> = {}) {
        this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
    }

    /**
     * Add a transformer to the pipeline
     * Transformers are automatically sorted by priority
     */
    add(transformer: SvgTransformer): this {
        this.transformers.push(transformer);
        this.sortTransformers();
        return this;
    }

    /**
     * Remove a transformer by name
     */
    remove(name: string): this {
        this.transformers = this.transformers.filter(t => t.name !== name);
        return this;
    }

    /**
     * Get a transformer by name
     */
    get(name: string): SvgTransformer | undefined {
        return this.transformers.find(t => t.name === name);
    }

    /**
     * Enable or disable a transformer by name
     */
    setEnabled(name: string, enabled: boolean): this {
        const transformer = this.get(name);
        if (transformer) {
            transformer.enabled = enabled;
        }
        return this;
    }

    /**
     * Clear all transformers from the pipeline
     */
    clear(): this {
        this.transformers = [];
        return this;
    }

    /**
     * Get the number of transformers in the pipeline
     */
    get length(): number {
        return this.transformers.length;
    }

    /**
     * Process SVG through all enabled transformers
     */
    async process(svg: string, sourceElement: HTMLElement): Promise<string> {
        const ctx: TransformContext = {
            svg,
            sourceElement,
            modified: false,
            metadata: {
                startTime: performance.now(),
                transformersApplied: [],
            },
        };

        for (const transformer of this.transformers) {
            if (!transformer.enabled) {
                continue;
            }

            try {
                const maybePromise = transformer.transform(ctx);
                const result = await Promise.resolve(maybePromise);

                if (result.modified) {
                    ctx.svg = result.svg;
                    ctx.modified = true;
                    ctx.metadata.transformersApplied.push(transformer.name);
                }
            } catch (error) {
                console.error(`TikZJax: Transformer "${transformer.name}" failed`, error);

                if (!this.config.continueOnError) {
                    throw error;
                }
            }
        }

        if (this.config.debug) {
            const elapsed = performance.now() - ctx.metadata.startTime;
            console.debug(
                `TikZJax Pipeline: processed in ${elapsed.toFixed(2)}ms`,
                `transformers: [${ctx.metadata.transformersApplied.join(', ')}]`
            );
        }

        return ctx.svg;
    }

    /**
     * Sort transformers by priority (ascending)
     */
    private sortTransformers(): void {
        this.transformers.sort((a, b) => a.priority - b.priority);
    }
}

/**
 * Create a new pipeline instance
 */
export function createPipeline(config?: Partial<PipelineConfig>): SvgPipeline {
    return new SvgPipeline(config);
}

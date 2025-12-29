/**
 * SVG Transformer Pipeline - Type Definitions
 * 
 * This module defines the core interfaces for the transformer pipeline architecture.
 * Transformers can be synchronous or asynchronous, allowing for flexible composition.
 */

/**
 * Context object passed through the transformer pipeline
 * Contains SVG content and metadata for processing
 */
export interface TransformContext {
    /** The SVG string being transformed */
    svg: string;
    /** The original SVG element (readonly reference) */
    readonly sourceElement: HTMLElement;
    /** Indicates if any transformer has modified the SVG */
    modified: boolean;
    /** Metadata for debugging and logging */
    metadata: {
        startTime: number;
        transformersApplied: string[];
    };
}

/**
 * Result of a transformer operation
 */
export interface TransformResult {
    /** The transformed SVG string */
    svg: string;
    /** Whether this transformer made changes */
    modified: boolean;
}

/**
 * Base interface for all SVG transformers
 * Transformers are composable units that process SVG content
 */
export interface SvgTransformer {
    /** Unique identifier for the transformer */
    readonly name: string;
    /** Priority for ordering (lower = earlier, default 100) */
    readonly priority: number;
    /** Whether this transformer is enabled */
    enabled: boolean;
    /**
     * Transform the SVG content
     * @param ctx - The transformation context
     * @returns The transformation result (sync or async)
     */
    transform(ctx: TransformContext): TransformResult | Promise<TransformResult>;
}

/**
 * Configuration for the SVG processing pipeline
 */
export interface PipelineConfig {
    /** Enable debug logging */
    debug: boolean;
    /** Timeout for async operations (ms) */
    asyncTimeout: number;
    /** Whether to continue on transformer errors */
    continueOnError: boolean;
}

/**
 * Default pipeline configuration
 */
export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
    debug: false,
    asyncTimeout: 5000,
    continueOnError: true,
};

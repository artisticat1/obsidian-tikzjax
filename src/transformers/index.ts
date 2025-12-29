/**
 * SVG Transformer Module - Public API
 * 
 * Re-exports all transformer-related types and implementations
 */

// Types
export type {
    TransformContext,
    TransformResult,
    SvgTransformer,
    PipelineConfig,
} from './types';

export { DEFAULT_PIPELINE_CONFIG } from './types';

// Pipeline
export { SvgPipeline, createPipeline } from './pipeline';

// Transformers
export {
    DarkModeColorTransformer,
    createDarkModeTransformer,
} from './dark-mode-transformer';

export {
    SvgoOptimizationTransformer,
    createSvgoTransformer,
} from './svgo-transformer';

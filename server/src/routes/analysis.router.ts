import { Router } from 'express';
import { postVisualAnalysis } from '../controllers/analysis.controller.js';

export const analysisRouter: Router = Router();

analysisRouter.post('/analyze/visual', postVisualAnalysis);

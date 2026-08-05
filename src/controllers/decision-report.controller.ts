import { Request, Response } from 'express';
import { decisionReportSchema } from '../validators/decision-report.validator';
import { decisionReportService } from '../services/decision-report/decision-report.service';
import { reportRendererService } from '../services/decision-report/report-renderer.service';
import { DecisionReportInput } from '../types/decision-report.types';
import { CropVarietyModel } from '../models/CropVariety.model';
import { kenyaCounties } from '../utils/validators';
import { logError, logInfo } from '../utils/logger';

export class DecisionReportController {
  async generate(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const { error, value } = decisionReportSchema.validate(req.body, { abortEarly: false, stripUnknown: true, convert: true });
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details.map((detail) => detail.message),
        });
        return;
      }

      const input: DecisionReportInput = value;
      const reportData = await decisionReportService.buildReportData(input);
      const html = reportRendererService.renderFarmDecisionReport(reportData);

      logInfo('Farm decision report generated via API', {
        userId,
        reportId: reportData.summary.reportId,
        county: input.county,
      });

      res.json({
        success: true,
        message: 'Farm decision report generated successfully',
        data: {
          reportId: reportData.summary.reportId,
          generatedAt: reportData.summary.generatedAtLabel,
          html,
        },
      });
    } catch (error) {
      const err = error as Error;
      logError('Failed to generate farm decision report via API', err, {
        userId: req.user?.id,
        body: req.body,
      });

      const statusCode = err.message.includes('not found') || err.message.includes('None of the selected') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: err.message || 'Failed to generate farm decision report',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }

  async getFormOptions(req: Request, res: Response): Promise<void> {
    try {
      const varieties = await CropVarietyModel.findAll({
        where: { cropType: 'potato' },
        order: [['name', 'ASC']],
      });

      res.json({
        success: true,
        data: {
          counties: kenyaCounties,
          varieties: varieties.map((v) => ({
            id: v.id,
            name: v.name,
            maturityPeriodDays: v.maturityPeriodDays,
            averageYieldPerAcre: v.averageYieldPerAcre,
          })),
          waterSources: ['rainfed', 'irrigated'],
          seedSources: ['certified', 'farm_saved', 'unknown'],
          priorities: ['yield', 'disease_resistance', 'cost', 'balanced'],
        },
      });
    } catch (error) {
      const err = error as Error;
      logError('Failed to load farm decision report form options via API', err, { userId: req.user?.id });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve form options',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }
}

export const decisionReportController = new DecisionReportController();
export default decisionReportController;

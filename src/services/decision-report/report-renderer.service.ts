import ejs from 'ejs';
import { env } from '../../config/environment';
import { DecisionReportData } from '../../types/decision-report.types';
import { FARM_DECISION_REPORT_TEMPLATE } from '../../templates/reports/farm-decision-report.template';

const DEFAULT_LOGO_URL = 'https://xnrlzezteajvrhlq.public.blob.vercel-storage.com/farmmall/WhatsApp_Image_2025-09-07_at_8.31.25_AM-removebg-preview%20%281%29.png';

export class ReportRendererService {
  renderFarmDecisionReport(data: DecisionReportData): string {
    const logoUrl = env.FARM_MALL_LOGO_URL || DEFAULT_LOGO_URL;

    return ejs.render(FARM_DECISION_REPORT_TEMPLATE, {
      summary: data.summary,
      predictions: data.predictions,
      logoUrl,
    });
  }
}

export const reportRendererService = new ReportRendererService();
export default reportRendererService;

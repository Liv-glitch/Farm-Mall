-- Update farm preparation activity content and Farm Mall service links.
-- This preserves completion data (`completed`, `date_completed`, `cost`, `supplier`)
-- while refreshing the descriptive fields for plans that already exist.

SET NAMES utf8mb4;

UPDATE `preproduction_tasks` t
INNER JOIN `preproduction_steps` s ON s.id = t.step_id
SET
  t.title = 'Land Selection',
  t.activity_type = 'informational',
  t.importance = 'Choose a well-drained field with a suitable crop rotation history to reduce disease pressure and improve yields.',
  t.recommendations = JSON_ARRAY(
    'Select well-drained land, avoiding fields where potatoes, tomatoes, peppers, or eggplant were planted in the last 2 seasons.',
    'Review crop rotation history.'
  ),
  t.service_links = NULL,
  t.what_you_need = NULL,
  t.what_you_need_link = NULL,
  t.expert_tip = NULL,
  t.updated_at = NOW()
WHERE s.title = 'Land Selection' AND t.`order` = 1;

UPDATE `preproduction_tasks` t
INNER JOIN `preproduction_steps` s ON s.id = t.step_id
SET
  t.title = 'Soil Testing',
  t.activity_type = 'task',
  t.importance = 'Soil testing helps determine nutrient requirements and pH levels, ensuring accurate fertilizer recommendations and reducing unnecessary input costs.',
  t.recommendations = NULL,
  t.service_links = JSON_ARRAY(
    JSON_OBJECT('label', 'Access Soil Testing Services here', 'href', 'https://farmflow-platform.onrender.com/marketplace?category=soil-testing')
  ),
  t.what_you_need = NULL,
  t.what_you_need_link = NULL,
  t.expert_tip = NULL,
  t.updated_at = NOW()
WHERE s.title = 'Soil Testing' AND t.`order` = 1;

UPDATE `preproduction_tasks` t
INNER JOIN `preproduction_steps` s ON s.id = t.step_id
SET
  t.title = 'Residue and Weed Clearance',
  t.activity_type = 'informational',
  t.importance = 'Removing previous crop residues and weeds reduces pest and disease carryover while improving field preparation.',
  t.recommendations = NULL,
  t.service_links = NULL,
  t.what_you_need = NULL,
  t.what_you_need_link = NULL,
  t.expert_tip = NULL,
  t.updated_at = NOW()
WHERE s.title = 'Land Preparation' AND t.`order` = 1;

UPDATE `preproduction_tasks` t
INNER JOIN `preproduction_steps` s ON s.id = t.step_id
SET
  t.title = 'First Plowing',
  t.activity_type = 'task',
  t.importance = 'Breaks compacted soil and improves aeration for root development.',
  t.recommendations = JSON_ARRAY(
    'Plow to approximately 12 cm depth.',
    'Ideally complete this 3–4 weeks before planting.'
  ),
  t.service_links = JSON_ARRAY(
    JSON_OBJECT('label', 'Access tractor or ox-plowing services', 'href', 'https://farmflow-platform.onrender.com/marketplace?category=mechanization')
  ),
  t.what_you_need = NULL,
  t.what_you_need_link = NULL,
  t.expert_tip = NULL,
  t.updated_at = NOW()
WHERE s.title = 'Land Preparation' AND t.`order` = 2;

UPDATE `preproduction_tasks` t
INNER JOIN `preproduction_steps` s ON s.id = t.step_id
SET
  t.title = 'Second Plowing',
  t.activity_type = 'task',
  t.importance = 'Creates a finer seedbed and improves soil structure for planting.',
  t.recommendations = JSON_ARRAY(
    'Conduct after initial soil settling.',
    'Ensure clods are adequately broken down.'
  ),
  t.service_links = JSON_ARRAY(
    JSON_OBJECT('label', 'Access plowing services', 'href', 'https://farmflow-platform.onrender.com/marketplace?category=mechanization')
  ),
  t.what_you_need = NULL,
  t.what_you_need_link = NULL,
  t.expert_tip = NULL,
  t.updated_at = NOW()
WHERE s.title = 'Land Preparation' AND t.`order` = 3;

UPDATE `preproduction_tasks` t
INNER JOIN `preproduction_steps` s ON s.id = t.step_id
SET
  t.title = 'Harrowing',
  t.activity_type = 'task',
  t.importance = 'Produces a fine, level seedbed and helps incorporate amendments.',
  t.recommendations = JSON_ARRAY('Ensure soil is loose and level before planting.'),
  t.service_links = JSON_ARRAY(
    JSON_OBJECT('label', 'Access harrowing services', 'href', 'https://farmflow-platform.onrender.com/marketplace?category=mechanization')
  ),
  t.what_you_need = NULL,
  t.what_you_need_link = NULL,
  t.expert_tip = NULL,
  t.updated_at = NOW()
WHERE s.title = 'Land Preparation' AND t.`order` = 4;

UPDATE `preproduction_tasks` t
INNER JOIN `preproduction_steps` s ON s.id = t.step_id
SET
  t.title = 'Organic Manure Application',
  t.activity_type = 'task',
  t.importance = 'Improves soil organic matter, water retention, and nutrient availability.',
  t.recommendations = JSON_ARRAY(
    'Use well-decomposed manure.',
    'Apply based on soil fertility needs.'
  ),
  t.service_links = JSON_ARRAY(
    JSON_OBJECT('label', 'Purchase manure through Farm Mall', 'href', 'https://farmflow-platform.onrender.com/marketplace?category=fertilizers')
  ),
  t.what_you_need = NULL,
  t.what_you_need_link = NULL,
  t.expert_tip = NULL,
  t.updated_at = NOW()
WHERE s.title = 'Land Preparation' AND t.`order` = 5;

UPDATE `preproduction_tasks` t
INNER JOIN `preproduction_steps` s ON s.id = t.step_id
SET
  t.title = 'Soil Fertility Management',
  t.activity_type = 'task',
  t.importance = 'Proper fertility management improves plant growth, yield, and tuber quality.',
  t.recommendations = JSON_ARRAY('Based on your soil test results, apply the recommended nutrients and amendments.'),
  t.service_links = JSON_ARRAY(
    JSON_OBJECT('label', 'Purchase recommended fertilizers', 'href', 'https://farmflow-platform.onrender.com/marketplace?category=fertilizers'),
    JSON_OBJECT('label', 'Access agronomy support', 'href', 'https://farmflow-platform.onrender.com/marketplace?category=advisory')
  ),
  t.what_you_need = NULL,
  t.what_you_need_link = NULL,
  t.expert_tip = NULL,
  t.updated_at = NOW()
WHERE s.title = 'Soil Fertility Management' AND t.`order` = 1;

-- Replace old Render marketplace links in persisted preproduction task data.

UPDATE `preproduction_tasks`
SET
  `service_links` = REPLACE(CAST(`service_links` AS CHAR), 'https://farmflow-platform.onrender.com', 'https://inputs.farmmall.co.ke'),
  `what_you_need_link` = REPLACE(`what_you_need_link`, 'https://farmflow-platform.onrender.com', 'https://inputs.farmmall.co.ke')
WHERE
  CAST(`service_links` AS CHAR) LIKE '%https://farmflow-platform.onrender.com%'
  OR `what_you_need_link` LIKE '%https://farmflow-platform.onrender.com%';

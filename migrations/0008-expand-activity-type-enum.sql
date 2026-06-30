ALTER TABLE `activities`
  MODIFY `type` ENUM(
    'planting',
    'fertilizing',
    'fertilization',
    'weeding',
    'pest_control',
    'disease_control',
    'irrigation',
    'harvesting',
    'soil_preparation',
    'other'
  ) NOT NULL;

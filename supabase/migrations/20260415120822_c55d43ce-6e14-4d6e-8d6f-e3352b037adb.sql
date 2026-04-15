
UPDATE process_deadlines
SET is_completed = true,
    completed_at = now(),
    document_url = 'retroactive-cleanup-2025'
WHERE id IN (
  'faaf0a89-845f-4c81-a288-80c13bfd729f',
  '899510be-6ae2-4894-81c4-8144b8963295',
  '90ed7608-2f0d-4dca-85df-3cec82ccaf0e',
  'b0cc088b-1421-49a6-badd-e99db9df6642',
  '300336af-0e9d-4db1-b96f-1d8997ce360c',
  '9dd40ad4-72bb-4a9e-a7a9-749101c684a9',
  '153622c0-a0dd-4911-9342-a707755bd4ea',
  '4a6f5d96-cef3-49f7-8805-6eb029ed7702',
  'ecd418a0-0842-4d5a-b7ac-49e264d02ffa',
  'c476ca75-8458-4f25-9ffa-ba53712d807b',
  '880ed2c5-fb1c-4412-87b2-ab63ed021983',
  'd7439455-5722-4df9-8966-91e42f5fcf35',
  '4acaef52-f34b-4a96-9542-1000525291fe',
  '65d1a0e7-eb65-47e2-a704-3768663bcf98',
  '66d2b1e1-67ed-4f0d-bf43-24c336b3ba6b',
  'ca724257-ca52-4346-af6b-ff4e14efb279',
  '167c4788-71ad-4c5e-9aad-1775d3758172',
  '84c124c8-62ea-4d59-82e3-351fe328c5ac',
  '6b5378a6-de9e-4792-8e51-919c749bd166'
)
AND is_completed = false;

UPDATE process_deadlines
SET is_completed = true,
    completed_at = now(),
    document_url = 'retroactive-cleanup'
WHERE id IN (
  '1accaab1-a1d4-4906-98ff-0622c6cac729',
  '233e3092-7427-43be-af7f-4a2ff609d6af',
  'abbed81f-2c5c-4a6e-b0fb-f38b7aaf75a7',
  '355a0504-c3da-4eb2-9646-d0dd2f0b0c78',
  'f74dcf3b-25e0-4e3e-aadf-a59903e33985',
  '7ac9beb4-6cc9-4fe8-958e-8b9df94bbf89',
  '59125ba4-b96c-4ca6-bef7-aef7fadb1a7c',
  'e00bee19-c11a-4626-bebc-c8a9ed330095',
  '841a048b-fb31-4067-bcf5-faaa09955a5a',
  'a089976e-40c8-4f64-96fc-12597798b7c4',
  'ea7bc15d-0173-407e-81e8-ba6a12e61c72',
  'c21f08ed-6fdf-49aa-bc5c-8d74407b91f0',
  '69c785d9-56a4-47e3-b7ef-e76ab48343bd'
)
AND is_completed = false;
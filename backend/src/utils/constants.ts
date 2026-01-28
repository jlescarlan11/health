export const VALID_SERVICES: string[] = [
  'Adolescent Health',
  'Animal Bite Clinic',
  'Blood Bank',
  'Clinical Chemistry',
  'Clinical Microscopy',
  'Consultation',
  'Dental',
  'Dermatology',
  'Dialysis',
  'ECG',
  'ENT',
  'Emergency',
  'Eye Center',
  'Family Planning',
  'General Medicine',
  'HIV Treatment',
  'Hematology',
  'Immunization',
  'Internal Medicine',
  'Laboratory',
  'Maternal Care',
  'Mental Health',
  'Nutrition Services',
  'OB-GYN',
  'Pediatrics',
  'Primary Care',
  'Radiology',
  'Stroke Unit',
  'Surgery',
  'Trauma Care',
  'X-ray',
];

/**
 * Maps colloquial medical terms or AI-recommended services to canonical VALID_SERVICES.
 * Ensures consistent matching even if the AI uses slightly different terminology.
 */
export const resolveServiceAlias = (service: string): string => {
  const s = service.toLowerCase();

  // Mapping to strict VALID_SERVICES
  if (s.includes('bite') || s.includes('rabies') || s.includes('animal'))
    return 'Animal Bite Clinic';
  if (s.includes('baby') || s.includes('child') || s.includes('pedia') || s.includes('infant'))
    return 'Pediatrics';
  if (
    s.includes('pregnant') ||
    s.includes('prenatal') ||
    s.includes('maternal') ||
    s.includes('mother') ||
    s.includes('pregnancy')
  )
    return 'Maternal Care';
  if (
    s.includes('tooth') ||
    s.includes('teeth') ||
    s.includes('mouth') ||
    s.includes('dental') ||
    s.includes('oral')
  )
    return 'Dental';
  if (s.includes('skin') || s.includes('rash') || s.includes('derma') || s.includes('itch'))
    return 'Dermatology';
  if (s.includes('eyes') || s.includes('vision') || s.includes('sight') || s.includes('ophthal'))
    return 'Eye Center';
  if (
    s.includes('psych') ||
    s.includes('mental') ||
    s.includes('depress') ||
    s.includes('anxiety') ||
    s.includes('behavioral')
  )
    return 'Mental Health';
  if (s.includes('bone') || s.includes('fracture') || s.includes('ortho') || s.includes('broken'))
    return 'Surgery';
  if (
    s.includes('cut') ||
    s.includes('wound') ||
    s.includes('stitch') ||
    s.includes('injury') ||
    s.includes('trauma')
  )
    return 'Trauma Care';
  if (
    s.includes('heart') ||
    s.includes('cardio') ||
    s.includes('chest pain') ||
    s.includes('blood pressure') ||
    s.includes('hypertension')
  )
    return 'Internal Medicine';
  if (
    s.includes('lungs') ||
    s.includes('breath') ||
    s.includes('pulmo') ||
    s.includes('respiratory') ||
    s.includes('asthma') ||
    s.includes('cough')
  )
    return 'Internal Medicine';
  if (
    s.includes('stomach') ||
    s.includes('digestion') ||
    s.includes('nausea') ||
    s.includes('diarrhea') ||
    s.includes('gastric')
  )
    return 'Internal Medicine';
  if (
    s.includes('kidney') ||
    s.includes('renal') ||
    s.includes('urinary') ||
    s.includes('dialysis')
  )
    return 'Dialysis';
  if (s.includes('ear') || s.includes('nose') || s.includes('throat') || s.includes('ent'))
    return 'ENT';
  if (s.includes('x-ray') || s.includes('xray') || s.includes('imaging') || s.includes('scan'))
    return 'X-ray';
  if (
    s.includes('blood test') ||
    s.includes('lab') ||
    s.includes('laboratory') ||
    s.includes('stool test') ||
    s.includes('urine test')
  )
    return 'Laboratory';
  if (s.includes('vaccine') || s.includes('vax') || s.includes('shot') || s.includes('immuniz'))
    return 'Immunization';
  if (s.includes('emergency') || s.includes('er') || s.includes('urgent')) return 'Emergency';
  if (s.includes('checkup') || s.includes('general') || s.includes('routine'))
    return 'General Medicine';
  if (s.includes('adolescent') || s.includes('teen')) return 'Adolescent Health';
  if (s.includes('ob') || s.includes('gyne') || s.includes('women health')) return 'OB-GYN';
  if (s.includes('nutrition') || s.includes('diet') || s.includes('weight'))
    return 'Nutrition Services';
  if (s.includes('family planning') || s.includes('contraception') || s.includes('birth control'))
    return 'Family Planning';

  return service;
};

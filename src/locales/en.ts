const en = {
  safety_note: {
    title: 'Safety Note',
    readiness_upgrade:
      'Recommended higher care level because some key details were unclear, and a cautious next step is safest.',
    red_flag_upgrade:
      'Recommended higher care level because some warning signs can be serious even if you feel okay right now.',
    recent_resolved_floor:
      'Recommended higher care level because a serious symptom you recently had still needs a checkup, even if it has eased.',
    system_based_lock_cardiac:
      'Recommended higher care level because your symptoms involve the chest or heart area, which should be checked promptly.',
    system_based_lock_respiratory:
      'Recommended higher care level because your symptoms affect breathing, which should be checked promptly.',
    system_based_lock_neurological:
      'Recommended higher care level because your symptoms affect the brain or nerves, which should be checked promptly.',
    system_based_lock_trauma:
      'Recommended higher care level because your symptoms suggest an injury that needs prompt evaluation.',
    system_based_lock_abdomen:
      'Recommended higher care level because your symptoms involve strong belly pain, which should be checked promptly.',
    consensus_check:
      'Recommended higher care level after a safety review confirmed a more cautious plan.',
    age_escalation:
      'Recommended higher care level because age can affect risk, and we want you to be safe.',
    mental_health_override:
      'Recommended urgent care because your responses suggest you may need immediate support. Help is available.',
    offline_fallback:
      'Recommended this care level based on local safety checks while the full assessment was unavailable.',
    manual_override:
      'Recommended this care level after a safety review, to make sure you get the right help.',
    authority_block:
      'Adjusted the care level because you clearly said you do not have key emergency warning signs.',
    fallback: 'Recommended this care level to keep you safe based on the information you shared.',
    legacy_recent_resolved:
      'Recommended higher care level because the symptom you recently experienced requires professional evaluation, even if it has currently stopped.',
    legacy_missing_fields: 'Recommended higher care level because {{list}} {{verb}} unclear.',
    legacy_complex_or_vague:
      'Recommended higher care level because your symptoms are complex or vague.',
  },
};

export default en;

import { Facility } from '../types';

export const getOpenStatus = (
  facility: Facility,
): { isOpen: boolean; text: string; color: string } => {
  const { hours, operatingHours, is_24_7 } = facility;

  // 0. Check explicit 24/7 flag first
  if (is_24_7) {
    return { isOpen: true, text: 'Open 24/7', color: 'green' };
  }

  // 1. Check structured data next
  if (operatingHours) {
    if (operatingHours.is24x7) {
      return { isOpen: true, text: 'Open 24/7', color: 'green' };
    }

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sun, 6 = Sat

    // Check specific schedule for today
    if (operatingHours.schedule) {
      const todayHours = operatingHours.schedule[dayOfWeek];

      if (todayHours) {
        // Adjust to PH time if needed, but assuming device time is local for now
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentTimeInMinutes = currentHours * 60 + currentMinutes;

        const [openH, openM] = todayHours.open.split(':').map(Number);
        const [closeH, closeM] = todayHours.close.split(':').map(Number);

        const openTimeInMinutes = openH * 60 + openM;
        let closeTimeInMinutes = closeH * 60 + closeM;

        // Handle midnight closing (00:00) as end of day (24:00)
        if (closeTimeInMinutes === 0) {
          closeTimeInMinutes = 24 * 60;
        }

        if (
          currentTimeInMinutes >= openTimeInMinutes &&
          currentTimeInMinutes < closeTimeInMinutes
        ) {
          // Format close time to 12h for display
          const closeH12 = closeH % 12 || 12;
          const closeAmPm = closeH >= 12 ? 'PM' : 'AM';
          const closeTimeDisplay = `${closeH12}:${closeM.toString().padStart(2, '0')} ${closeAmPm}`;
          return { isOpen: true, text: `Open until ${closeTimeDisplay}`, color: 'green' };
        } else {
          return { isOpen: false, text: 'Closed', color: 'red' };
        }
      } else {
        // Null entry means closed today
        return { isOpen: false, text: 'Closed Today', color: 'red' };
      }
    }

    // Fallback to simple open/close if schedule missing
    if (operatingHours.open && operatingHours.close) {
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeInMinutes = currentHours * 60 + currentMinutes;

      const [openH, openM] = operatingHours.open.split(':').map(Number);
      const [closeH, closeM] = operatingHours.close.split(':').map(Number);

      const openTimeInMinutes = openH * 60 + openM;
      const closeTimeInMinutes = closeH * 60 + closeM;

      if (currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes < closeTimeInMinutes) {
        return { isOpen: true, text: 'Open Now', color: 'green' };
      } else {
        return { isOpen: false, text: 'Closed', color: 'red' };
      }
    }
  }

  // 2. Fallback to legacy string parsing
  if (!hours) return { isOpen: false, text: 'Hours N/A', color: 'gray' };

  if (hours.toLowerCase().includes('24/7') || hours.toLowerCase().includes('24 hours')) {
    return { isOpen: true, text: 'Open 24/7', color: 'green' };
  }

  // Basic heuristic fallback
  const now = new Date();
  const currentHour = now.getHours();
  const isBusinessHours = currentHour >= 8 && currentHour < 17;

  if (isBusinessHours) {
    return { isOpen: true, text: 'Open Now', color: 'green' };
  }

  return { isOpen: false, text: 'Closed', color: 'red' };
};

/**
 * Calculates a priority score for a facility based on care level, service matches, and distance.
 * Higher score = higher priority.
 */
export const scoreFacility = (
  facility: Facility,
  targetLevel: string,
  requiredServices: string[],
) => {
  let score = 0;

  // 1. Level match (Primary weight)
  const type = facility.type?.toLowerCase() || '';
  const isEmergencyTarget = targetLevel === 'emergency' || targetLevel === 'hospital';
  const isHealthCenterTarget = targetLevel === 'health_center';

  const matchesEmergency =
    type.includes('hospital') || type.includes('infirmary') || type.includes('emergency');
  const matchesHealthCenter =
    type.includes('health') || type.includes('unit') || type.includes('center');

  if ((isEmergencyTarget && matchesEmergency) || (isHealthCenterTarget && matchesHealthCenter)) {
    score += 1000;
  }

  // 2. Service matches (Secondary weight)
  if (requiredServices.length > 0) {
    const allFacilityServices = [
      ...facility.services,
      ...(facility.specialized_services || []),
    ];

    const matches = requiredServices.filter((req) =>
      allFacilityServices.some(
        (s) =>
          s.toLowerCase().includes(req.toLowerCase()) ||
          req.toLowerCase().includes(s.toLowerCase()),
      ),
    );

    // Score based on proportion of matches (up to 500 points)
    score += (matches.length / requiredServices.length) * 500;

    // Bonus for matching ALL services (extra 100 points)
    if (matches.length === requiredServices.length) {
      score += 100;
    }
  }

  // 3. Distance (Tertiary weight - subtractive)
  // Each km subtracts 1 point, so closer facilities win tie-breakers
  const distance = facility.distance || 0;
  score -= Math.min(distance, 100); // Max penalty 100 points

  return score;
};

/**
 * Filter and score facilities based on relevant services from an assessment.
 * Returns facilities with an additional matchScore and explanation of matches.
 */
export interface ScoredFacility extends Facility {
  matchScore: number;
  matchedServices: string[];
}

export const filterFacilitiesByServices = (
  facilities: Facility[],
  relevantServices: string[],
): ScoredFacility[] => {
  if (!relevantServices || relevantServices.length === 0) {
    return facilities.map((f) => ({ ...f, matchScore: 0, matchedServices: [] }));
  }

  return facilities
    .map((facility) => {
      const allFacilityServices = [
        ...facility.services,
        ...(facility.specialized_services || []),
      ];

      const matchedServices = relevantServices.filter((req) =>
        allFacilityServices.some(
          (s) =>
            s.toLowerCase().includes(req.toLowerCase()) ||
            req.toLowerCase().includes(s.toLowerCase()),
        ),
      );

      // Deterministic scoring: 100 points per match
      const matchScore = matchedServices.length * 100;

      return {
        ...facility,
        matchScore,
        matchedServices,
      };
    })
    .filter((f) => f.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);
};

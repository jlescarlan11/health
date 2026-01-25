import { findNearestFacilitiesByType, calculateDistance } from '../locationUtils';
import { Facility } from '../../types';

describe('locationUtils', () => {
  const mockFacilities: Facility[] = [
    {
      id: '1',
      name: 'Naga City Hospital',
      type: 'Hospital',
      services: [],
      address: 'Address 1',
      latitude: 13.6218,
      longitude: 123.1841,
      yakapAccredited: true,
    },
    {
      id: '2',
      name: 'Health Center A',
      type: 'Health Center',
      services: [],
      address: 'Address 2',
      latitude: 13.625,
      longitude: 123.19,
      yakapAccredited: false,
    },
    {
      id: '3',
      name: 'Health Center B',
      type: 'Health Center',
      services: [],
      address: 'Address 3',
      latitude: 13.63,
      longitude: 123.2,
      yakapAccredited: true,
    },
  ];

  const userLocation = {
    latitude: 13.62,
    longitude: 123.18,
  };

  describe('findNearestFacilitiesByType', () => {
    it('should find the nearest Hospital and Health Center', () => {
      const result = findNearestFacilitiesByType(mockFacilities, userLocation);

      expect(result['Hospital']).not.toBeNull();
      expect(result['Hospital']?.id).toBe('1');

      expect(result['Health Center']).not.toBeNull();
      expect(result['Health Center']?.id).toBe('2'); // Health Center A is closer than B
    });

    it('should handle missing types', () => {
      const hospitalOnly = mockFacilities.filter((f) => f.type === 'Hospital');
      const result = findNearestFacilitiesByType(hospitalOnly, userLocation);

      expect(result['Hospital']).not.toBeNull();
      expect(result['Health Center']).toBeNull();
    });

    it('should return nulls if facilities list is empty', () => {
      const result = findNearestFacilitiesByType([], userLocation);
      expect(result['Hospital']).toBeNull();
      expect(result['Health Center']).toBeNull();
    });

    it('should return nulls if user location is missing', () => {
      const result = findNearestFacilitiesByType(mockFacilities, null);
      expect(result['Hospital']).toBeNull();
      expect(result['Health Center']).toBeNull();
    });

    it('should use existing distance if available', () => {
      const facilitiesWithDistance = [
        { ...mockFacilities[1], distance: 10 }, // Health Center A far away
        { ...mockFacilities[2], distance: 2 }, // Health Center B closer
      ];

      const result = findNearestFacilitiesByType(facilitiesWithDistance, userLocation);
      expect(result['Health Center']?.id).toBe('3');
      expect(result['Health Center']?.distance).toBe(2);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance correctly', () => {
      // Distance between (13.6200, 123.1800) and (13.6218, 123.1841) is approx 0.48 km
      const distance = calculateDistance(13.62, 123.18, 13.6218, 123.1841);
      expect(distance).toBeGreaterThan(0.4);
      expect(distance).toBeLessThan(0.6);
    });
  });

  describe('formatDistance', () => {
    it('should format distances less than 1km in meters', () => {
      const { formatDistance } = require('../locationUtils');
      expect(formatDistance(0.5)).toBe('500m');
      expect(formatDistance(0.01)).toBe('10m');
    });

    it('should format distances greater than or equal to 1km in kilometers', () => {
      const { formatDistance } = require('../locationUtils');
      expect(formatDistance(1.0)).toBe('1.0km');
      expect(formatDistance(12.34)).toBe('12.3km');
      expect(formatDistance(375.0)).toBe('375.0km');
    });
  });
});

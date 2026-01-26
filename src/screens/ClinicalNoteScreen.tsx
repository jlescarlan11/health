import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { IconButton, Divider, useTheme } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootState } from '../store';
import { RootStackParamList } from '../types/navigation';
import { StandardHeader, Button, Text } from '../components/common';
import { parseSoap, formatClinicalShareText } from '../utils/clinicalUtils';
import * as Print from 'expo-print';
import { sharingUtils } from '../utils/sharingUtils';
import QRCode from 'react-native-qrcode-svg';
import * as DB from '../services/database';

export const ClinicalNoteScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'ClinicalNote'>>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { recordId } = route.params || {};

  const latestAssessmentRedux = useSelector((state: RootState) => state.offline.latestAssessment);

  const [historicalRecord, setHistoricalRecord] = useState<DB.ClinicalHistoryRecord | null>(null);
  const [loading, setLoading] = useState(!!recordId);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (recordId) {
      const fetchRecord = async () => {
        try {
          setLoading(true);
          const record = await DB.getHistoryById(recordId);
          setHistoricalRecord(record);
        } catch (error) {
          console.error('Failed to fetch historical record:', error);
          Alert.alert('Error', 'Failed to load historical clinical record.');
        } finally {
          setLoading(false);
        }
      };
      fetchRecord();
    }
  }, [recordId]);

  const assessmentData = recordId ? historicalRecord : latestAssessmentRedux;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!assessmentData) {
    return (
      <View style={styles.centerContainer}>
        <StandardHeader
          title="Clinical Handover"
          showBackButton
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.emptyContainer}>
          <Text variant="bodyLarge">Clinical note not found.</Text>
          <IconButton
            icon="home"
            mode="contained"
            onPress={() => navigation.navigate('Home' as never)}
            style={styles.homeButton}
          />
        </View>
      </View>
    );
  }

  const sections = parseSoap(assessmentData.clinical_soap);
  const formattedDate = new Date(assessmentData.timestamp).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const shareText = formatClinicalShareText(
    assessmentData.clinical_soap,
    assessmentData.timestamp,
    assessmentData.medical_justification,
  );

  const handleSocialShare = async () => {
    await sharingUtils.shareReport('Clinical Referral Report', shareText);
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
              .header { border-bottom: 2px solid #379777; padding-bottom: 10px; margin-bottom: 30px; }
              .title { font-size: 24px; font-weight: bold; color: #379777; }
              .date { font-size: 14px; color: #666; }
              .section { margin-bottom: 20px; }
              .section-title { font-size: 16px; font-weight: bold; text-transform: uppercase; color: #379777; margin-bottom: 5px; }
              .content { font-size: 14px; line-height: 1.6; }
              .footer { margin-top: 50px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">Medical Referral Report</div>
              <div class="date">${formattedDate}</div>
            </div>
            ${
              sections.s
                ? `
              <div class="section">
                <div class="section-title">Subjective (History)</div>
                <div class="content">${sections.s}</div>
              </div>
            `
                : ''
            }
            ${
              sections.o
                ? `
              <div class="section">
                <div class="section-title">Objective (Signs)</div>
                <div class="content">${sections.o}</div>
              </div>
            `
                : ''
            }
            ${
              sections.a
                ? `
              <div class="section">
                <div class="section-title">Assessment (Triage)</div>
                <div class="content">${sections.a}</div>
              </div>
            `
                : ''
            }
            ${
              sections.p
                ? `
              <div class="section">
                <div class="section-title">Plan (Next Steps)</div>
                <div class="content">${sections.p}</div>
              </div>
            `
                : ''
            }
            ${
              !sections.s && !sections.o && !sections.a && !sections.p
                ? `
              <div class="section">
                <div class="section-title">Clinical Summary</div>
                <div class="content">${assessmentData.clinical_soap}</div>
              </div>
            `
                : ''
            }
            <div class="footer">
              Generated by HEALTH App - Naga City. Assessment ID: ${assessmentData.id}
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await sharingUtils.shareFile(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error('PDF Export failed:', error);
      Alert.alert('Export Error', 'Failed to generate PDF referral.');
    } finally {
      setExporting(false);
    }
  };

  const Section = ({ title, content }: { title: string; content?: string }) => {
    if (!content) return null;
    return (
      <View style={styles.section}>
        <Text variant="labelLarge" style={styles.sectionTitle}>
          {title}
        </Text>
        <Text variant="bodyLarge" style={styles.sectionContent}>
          {content}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardHeader
        title="Clinical Handover"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerInfo}>
          <Text variant="headlineSmall" style={styles.reportTitle}>
            Clinical Report
          </Text>
          <Text variant="bodyMedium" style={styles.timestamp}>
            {formattedDate}
          </Text>
          <Divider style={styles.divider} />
        </View>

        {sections.s || sections.o || sections.a || sections.p ? (
          <>
            <Section title="SUBJECTIVE (History)" content={sections.s} />
            <Section title="OBJECTIVE (Signs)" content={sections.o} />
            <Section title="ASSESSMENT (Triage)" content={sections.a} />
            <Section title="PLAN (Next Steps)" content={sections.p} />
          </>
        ) : (
          <Text variant="bodyLarge" style={styles.rawText}>
            {assessmentData.clinical_soap}
          </Text>
        )}

        <View style={styles.qrSection}>
          <Divider style={styles.qrDivider} />
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Digital Referral
          </Text>
          <Text variant="bodySmall" style={styles.qrSubtitle}>
            Clinic staff can scan this code to instantly view your clinical report.
          </Text>
          <View style={styles.qrContainer}>
            <QRCode
              value={shareText}
              size={screenWidth - 80}
              color="black"
              backgroundColor="white"
            />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.buttonRow}>
          <Button
            variant="outline"
            onPress={handleExportPDF}
            style={[styles.footerButton, { marginRight: 8 }]}
            title={exporting ? '...' : 'PDF'}
            icon="file-pdf-box"
            loading={exporting}
            disabled={exporting}
          />
          <Button
            variant="outline"
            onPress={handleSocialShare}
            style={styles.footerButton}
            title="Share"
            icon="share-variant"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  homeButton: {
    marginTop: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  headerInfo: {
    marginBottom: 24,
  },
  reportTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  timestamp: {
    opacity: 0.7,
    marginBottom: 16,
  },
  divider: {
    height: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    lineHeight: 24,
  },
  rawText: {
    lineHeight: 24,
  },
  qrSection: {
    marginTop: 16,
    alignItems: 'flex-start',
  },
  qrDivider: {
    width: '100%',
    marginBottom: 24,
  },
  qrSubtitle: {
    marginBottom: 20,
    opacity: 0.7,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    alignSelf: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  buttonRow: {
    flexDirection: 'row',
  },
  footerButton: {
    flex: 1,
  },
});

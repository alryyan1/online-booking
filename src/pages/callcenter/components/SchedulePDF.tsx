import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { type Specialization, type Doctor, type WorkingDay } from '../../../services/facilityService'
import { DAYS } from '../constants'

Font.register({
  family: 'Tajawal',
  fonts: [
    { src: '/Tajawal-Regular.ttf', fontWeight: 400 },
    { src: '/Tajawal-Bold.ttf', fontWeight: 700 },
  ],
})

interface SchedulePDFProps {
  specs: Specialization[];
  doctorsBySpec: Record<string, Doctor[]>;
}

const pdfStyles = StyleSheet.create({
  page: { padding: 15, fontFamily: 'Tajawal', direction: 'rtl', fontSize: 8 },
  title: { fontSize: 13, textAlign: 'center', marginBottom: 10, fontFamily: 'Tajawal' },
  table: { display: 'flex', width: '100%', borderStyle: 'solid', borderWidth: 1, borderColor: '#000' },
  row: { flexDirection: 'row-reverse' },
  headerRow: { flexDirection: 'row-reverse', backgroundColor: '#f3f4f6' },
  cellBase: { borderStyle: 'solid', borderWidth: 0.5, borderColor: '#000', padding: 4, textAlign: 'center', fontFamily: 'Tajawal' },
  specCell: { width: '12%' },
  docCell: { width: '15%', textAlign: 'right' },
  dayCell: { width: `${73 / 7}%` },
  headerText: { fontFamily: 'Tajawal', fontSize: 8, textAlign: 'center' },
  cellText: { fontFamily: 'Tajawal', fontSize: 7 },
})

export const SchedulePDF: React.FC<SchedulePDFProps> = ({ specs, doctorsBySpec }) => {
  const fmt = (ds?: WorkingDay | null) => {
    if (!ds) return '-'
    const m = ds.morning ? `ص: ${ds.morning.start}-${ds.morning.end}` : ''
    const e = ds.evening ? `م: ${ds.evening.start}-${ds.evening.end}` : ''
    return [m, e].filter(Boolean).join('\n') || '-'
  }
  const allRows = specs.flatMap((spec) => (doctorsBySpec[spec.id] || []).map((doc) => ({ spec, doc })))
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>{'جدول عمل الأطباء — ' + new Date().toLocaleDateString('ar-EG')}</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.headerRow}>
            {DAYS.map((d) => (
              <View key={d} style={[pdfStyles.cellBase, pdfStyles.dayCell]}>
                <Text style={pdfStyles.headerText}>{d}</Text>
              </View>
            ))}
            <View style={[pdfStyles.cellBase, pdfStyles.docCell]}><Text style={pdfStyles.headerText}>الطبيب</Text></View>
            <View style={[pdfStyles.cellBase, pdfStyles.specCell]}><Text style={pdfStyles.headerText}>التخصص</Text></View>
          </View>
          {allRows.map(({ spec, doc }) => (
            <View key={doc.id} style={pdfStyles.row}>
              {DAYS.map((day) => (
                <View key={day} style={[pdfStyles.cellBase, pdfStyles.dayCell]}>
                  <Text style={pdfStyles.cellText}>{fmt(doc.workingSchedule?.[day])}</Text>
                </View>
              ))}
              <View style={[pdfStyles.cellBase, pdfStyles.docCell]}><Text style={pdfStyles.cellText}>{doc.docName}</Text></View>
              <View style={[pdfStyles.cellBase, pdfStyles.specCell]}><Text style={pdfStyles.cellText}>{spec.specName}</Text></View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}

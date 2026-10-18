import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { PageHeader } from '@/components/admin/PageHeader';
import { Card, Chip, ErrorText, Loading } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { adminGetOrders, adminGetPayments } from '@/lib/api';
import { statusTone } from '@/lib/format';
import { peso } from '@/lib/pricing';
import { Bar, buildReport, ordersToCsv, Ranked, RANGES, RangeKey } from '@/lib/reports';
import { useLoad } from '@/lib/useLoad';

export default function Reports() {
  const { data, loading, error } = useLoad(async () => {
    const [orders, payments] = await Promise.all([adminGetOrders(), adminGetPayments()]);
    return { orders, payments };
  });
  const [range, setRange] = useState<RangeKey>('30d');
  const report = useMemo(() => (data ? buildReport(data.orders, data.payments, range) : null), [data, range]);

  if (loading) return <Loading />;
  if (error || !report) return <ErrorText message={error} />;

  const rangeLabel = RANGES.find((r) => r.key === range)!.label.toLowerCase();

  const exportCsv = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const blob = new Blob([ordersToCsv(report.rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purple-yam-orders-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <View>
      <PageHeader
        title="Reports"
        subtitle="How the bakery is doing: orders, income and best sellers."
        right={
          <Pressable onPress={exportCsv} style={styles.export}>
            <MaterialCommunityIcons name="download-outline" size={18} color={colors.plum700} />
            <Text style={styles.exportText}>Export orders (CSV)</Text>
          </Pressable>
        }
      />
      <View style={styles.filters}>
        {RANGES.map((r) => (
          <Chip key={r.key} label={r.label} selected={range === r.key} onPress={() => setRange(r.key)} />
        ))}
      </View>

      <View style={styles.tiles}>
        <Tile label="Income received" value={peso(report.income)} hint={`${report.paymentsCount} verified payment${report.paymentsCount === 1 ? '' : 's'}`} hot />
        <Tile label="Orders placed" value={String(report.totalOrders)} hint={`${report.completedOrders} completed · ${report.cancelledOrders} rejected/cancelled`} />
        <Tile label="Order value" value={peso(report.orderValue)} hint={`Avg ${peso(Math.round(report.avgOrder))} per order`} />
        <Tile label="Balance still to collect" value={peso(report.outstanding)} hint="Unpaid part of active orders" />
      </View>

      <View style={styles.cols}>
        <Card style={styles.wide}>
          <Text style={styles.h}>Income {report.seriesUnit === 'day' ? 'per day' : 'per month'}</Text>
          <Text style={styles.muted}>Verified payments, {rangeLabel}</Text>
          <Columns bars={report.series} />
        </Card>
        <Card style={styles.narrow}>
          <Text style={styles.h}>Orders by status</Text>
          <Text style={styles.muted}>Placed {rangeLabel}</Text>
          <View style={{ gap: 10, marginTop: 10 }}>
            {report.byStatus.map((s) => (
              <HBar key={s.status} label={s.label} value={s.value} max={Math.max(1, ...report.byStatus.map((x) => x.value))} text={String(s.value)} color={statusTone(s.status).fg} />
            ))}
          </View>
        </Card>
      </View>

      <View style={styles.cols}>
        <Card style={styles.third}>
          <Text style={styles.h}>Income by method</Text>
          <View style={{ gap: 10, marginTop: 10 }}>
            {report.byMethod.length === 0 ? <Text style={styles.muted}>No verified payments in this period.</Text> : null}
            {report.byMethod.map((m) => (
              <HBar key={m.label} label={m.label} value={m.value} max={report.byMethod[0].value} text={peso(m.value)} color={colors.plum700} />
            ))}
          </View>
        </Card>
        <RankCard title="Best-selling cakes" rows={report.topCakes} />
        <RankCard title="Top customers" rows={report.topCustomers} />
      </View>
    </View>
  );
}

function Tile({ label, value, hint, hot }: { label: string; value: string; hint: string; hot?: boolean }) {
  return (
    <View style={[styles.tile, hot && styles.tileHot]}>
      <Text style={[styles.tileL, hot && { color: colors.plum900 }]}>{label}</Text>
      <Text style={[styles.tileN, hot && { color: colors.plum900 }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.tileH, hot && { color: colors.plum900 }]}>{hint}</Text>
    </View>
  );
}

function Columns({ bars }: { bars: Bar[] }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  if (bars.length === 0 || bars.every((b) => b.value === 0)) return <Text style={[styles.muted, { marginTop: 24 }]}>No income recorded in this period.</Text>;
  const sparse = bars.length > 16;
  return (
    <View style={styles.chart}>
      {bars.map((b, i) => (
        <View key={b.label + i} style={styles.colWrap}>
          <View style={styles.colTrack}>
            <View
              style={[styles.colBar, { height: `${Math.max(b.value ? 3 : 0, (b.value / max) * 100)}%` }]}
              // @ts-ignore web-only tooltip
              title={`${b.label}: ${peso(b.value)}`}
            />
          </View>
          <Text style={styles.colLabel} numberOfLines={1}>
            {sparse && i % 3 !== 0 ? '' : b.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function HBar({ label, value, max, text, color }: { label: string; value: number; max: number; text: string; color: string }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.hLabel}>{label}</Text>
        <Text style={styles.hValue}>{text}</Text>
      </View>
      <View style={styles.hTrack}>
        <View style={[styles.hFill, { width: `${(value / max) * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function RankCard({ title, rows }: { title: string; rows: Ranked[] }) {
  return (
    <Card style={styles.third}>
      <Text style={styles.h}>{title}</Text>
      {rows.length === 0 ? <Text style={[styles.muted, { marginTop: 10 }]}>No orders in this period.</Text> : null}
      {rows.map((r, i) => (
        <View key={r.name} style={styles.rank}>
          <Text style={styles.rankN}>{i + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.hLabel} numberOfLines={1}>{r.name}</Text>
            <Text style={styles.muted}>{r.orders} order{r.orders === 1 ? '' : 's'}</Text>
          </View>
          <Text style={styles.hValue}>{peso(r.value)}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  export: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.plum700, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
  exportText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.plum700 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 14 },
  tile: { flexGrow: 1, flexBasis: 220, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 20, gap: 4 },
  tileHot: { backgroundColor: colors.gold, borderColor: colors.gold },
  tileL: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  tileN: { fontFamily: fonts.serif, fontSize: 32, color: colors.plum700 },
  tileH: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  cols: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 14 },
  wide: { flexGrow: 2, flexBasis: 480, gap: 2 },
  narrow: { flexGrow: 1, flexBasis: 300, gap: 2 },
  third: { flexGrow: 1, flexBasis: 300, gap: 2 },
  h: { fontFamily: fonts.serif, fontSize: 20, color: colors.text },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 220, marginTop: 16 },
  colWrap: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 6, minWidth: 8 },
  colTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  colBar: { width: '100%', backgroundColor: colors.plum700, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  colLabel: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted, height: 14, width: 60, textAlign: 'center' },
  hLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  hValue: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  hTrack: { height: 8, borderRadius: 4, backgroundColor: '#F1EBF3', overflow: 'hidden' },
  hFill: { height: 8, borderRadius: 4 },
  rank: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F1EAF3', marginTop: 4 },
  rankN: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.lilac, textAlign: 'center', lineHeight: 24, fontFamily: fonts.bold, fontSize: 12, color: colors.plum700 },
});

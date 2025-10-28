import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

// --- Styles matching the uploaded form ---
const styles = StyleSheet.create({
    page: {
        backgroundColor: '#fff',
        padding: 8,
        fontFamily: 'Helvetica',
        fontSize: 6,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 3,
        paddingHorizontal: 10,
    },
    logo: {
        width: 50,
        height: 50,
        marginRight: 5,
    },
    header: {
        flex: 1,
        textAlign: 'center',
    },
    companyName: {
        fontSize: 9,
        fontWeight: 'bold',
    },
    code: {
        fontSize: 7,
        marginBottom: 1,
    },
    title: {
        fontSize: 7,
        fontWeight: 'bold',
        textDecoration: 'underline',
        marginBottom: 3,
    },

    // --- Table Layout ---
    table: {
        display: 'flex',
        width: '100%',
        borderWidth: 0.8,
        borderColor: '#000',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 0.8,
        borderColor: '#000',
    },
    cell: {
        borderRightWidth: 0.8,
        borderColor: '#000',
        justifyContent: 'center',
        textAlign: 'center',
        paddingVertical: 1,
    },
    text: {
        fontSize: 6,
    },
    headerText: {
        fontSize: 6,
        fontWeight: 'bold',
        textAlign: 'center',
    },

    // --- Column Widths ---
    colSchedule: { width: '12%', padding: 0.5 },
    colNumber: { width: '1.5%', padding: 0.5 },
    colWorker: { width: '10%', padding: 0.5 },
    colDay: { width: `${(76.5 / 7).toFixed(2)}%` }, // evenly divide remaining 76.5%

    dayLabelCell: {
        borderBottomWidth: 0.8,
        borderColor: '#000',
        paddingVertical: 2,
        backgroundColor: '#e8e8e8',
    },
    inOutContainer: {
        flexDirection: 'row',
        borderBottomWidth: 0.8,
        borderColor: '#000',
    },
    inCell: {
        flex: 1,
        borderRightWidth: 0.8,
        borderColor: '#000',
        paddingVertical: 2,
        backgroundColor: '#e8e8e8',
        justifyContent: 'center',
    },
    outCell: {
        flex: 1,
        paddingVertical: 2,
        backgroundColor: '#e8e8e8',
        justifyContent: 'center',
    },
    inOutText: {
        fontSize: 5,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    emptyCell: {
        minHeight: 8,
    },
    leaveCell: {
        width: '23.5%',
        borderRightWidth: 0.8,
        borderColor: '#000',
        paddingLeft: 1,
    },
    totalRow: {
        backgroundColor: '#f0f0f0',
        fontWeight: 'bold',
    },
});

// --- Configuration matching your table ---
const positions = [
    { name: 'BOX FORMER', slots: 3 },
    { name: 'PALLETIZER', slots: 2 },
    { name: 'STEVEDOR', slots: 2 },
    { name: 'TOPPER', slots: 3 },
    { name: 'PALLETIZER', slots: 1 },
    { name: 'TOPPER', slots: 1 },
    { name: 'UTILITY', slots: 1 },
    { name: 'DEHANDER', slots: 1 },
    { name: 'M/BUG SPRAY', slots: 1 },
    { name: 'SWITCHMAN', slots: 1 },
    { name: 'Q.I.', slots: 1 },
    { name: 'STALK FILLER', slots: 1 },
    { name: 'C.P.', slots: 1 },
    { name: 'PACKER', slots: 8 },
    { name: 'LABELLER', slots: 4 },
    { name: 'WEIGHER', slots: 4 },
    { name: 'SELECTOR', slots: 6 },
    { name: 'SUPPORT: ABSENT', slots: 9 },
];

const leaveTypes = ['CW', 'ML', 'AWP', 'AWOP', 'SICK LEAVE', 'EMERGENCY LEAVE', 'CUT-OFF'];

const daysOfWeek = ['MON', 'TUES', 'WEDS', 'THURS', 'FRI', 'SAT', 'SUN'];

interface PackingPlantPDFProps {
    weekStart?: Date;
    workers?: { [key: string]: string[] };
}

export default function PackingPlantPDF({ weekStart = new Date(), workers = {} }: PackingPlantPDFProps = {}) {
    const PackingPlantDocument = () => {
        return (
            <Document>
                <Page size="LEGAL" orientation="portrait" style={styles.page}>
                    {/* Header */}
                    <View style={styles.headerContainer}>
                        <Image src="/Logo.png" style={styles.logo} />
                        <View style={styles.header}>
                            <Text style={styles.companyName}>CFARBEMPCO</Text>
                            <Text style={styles.code}>PP-2701</Text>
                            <Text style={styles.title}>DAILY CHECKING OF PP CREW</Text>
                        </View>
                    </View>

                    {/* Table */}
                    <View style={styles.table}>
                        {/* --- Header Row (Days) --- */}
                        <View style={styles.tableRow}>
                            <View style={[styles.cell, styles.colSchedule]}>
                                <Text style={styles.headerText}>DAILY WEEK SCHEDULE</Text>
                            </View>
                            <View style={[styles.cell, styles.colNumber]}>
                                <Text style={styles.headerText}>NO.</Text>
                            </View>
                            <View style={[styles.cell, styles.colWorker]}>
                                <Text style={styles.headerText}>NAME OF WORKERS</Text>
                            </View>

                            {/* Grouped Day Columns */}
                            {daysOfWeek.map((day, i) => (
                                <View key={i} style={[styles.colDay, styles.cell, { padding: 0 }]}>
                                    <View>
                                        <View style={styles.dayLabelCell}>
                                            <Text style={styles.headerText}>{day}</Text>
                                        </View>
                                        <View style={styles.inOutContainer}>
                                            <View style={styles.inCell}>
                                                <Text style={styles.inOutText}>IN</Text>
                                            </View>
                                            <View style={styles.outCell}>
                                                <Text style={styles.inOutText}>OUT</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* --- Worker Rows --- */}
                        {positions.map((p, pIndex) =>
                            Array.from({ length: p.slots }).map((_, i) => (
                                <View key={`${pIndex}-${i}`} style={styles.tableRow}>
                                    {i === 0 ? (
                                        <View style={[styles.cell, styles.colSchedule, { textAlign: 'left', paddingLeft: 3 }]}>
                                            <Text>{p.name}</Text>
                                        </View>
                                    ) : (
                                        <View style={[styles.cell, styles.colSchedule]} />
                                    )}
                                    <View style={[styles.cell, styles.colNumber]}>
                                        <Text>{i + 1}</Text>
                                    </View>
                                    <View style={[styles.cell, styles.colWorker]} />
                                    {daysOfWeek.map((_, dIndex) => (
                                        <View key={dIndex} style={[styles.colDay, styles.cell, { padding: 0 }]}>
                                            <View style={{ flexDirection: 'row', minHeight: 14 }}>
                                                <View
                                                    style={{
                                                        flex: 1,
                                                        borderRightWidth: 0.8,
                                                        borderColor: '#000',
                                                    }}
                                                />
                                                <View style={{ flex: 1 }} />
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )),
                        )}

                        {/* --- Leave Rows --- */}
                        {leaveTypes.map((leave, i) => (
                            <View key={i} style={styles.tableRow}>
                                <View style={[styles.cell, styles.leaveCell]}>
                                    <Text>{leave}</Text>
                                </View>
                                {daysOfWeek.map((_, dIndex) => (
                                    <View key={dIndex} style={[styles.colDay, styles.cell, { padding: 0 }]}>
                                        <View style={{ flexDirection: 'row', minHeight: 14 }}>
                                            <View
                                                style={{
                                                    flex: 1,
                                                    borderRightWidth: 0.8,
                                                    borderColor: '#000',
                                                }}
                                            />
                                            <View style={{ flex: 1 }} />
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ))}

                        {/* --- Total Row --- */}
                        <View style={[styles.tableRow, styles.totalRow]}>
                            <View style={[styles.cell, styles.leaveCell]}>
                                <Text>TOTAL</Text>
                            </View>
                            {daysOfWeek.map((_, i) => (
                                <View key={i} style={[styles.colDay, styles.cell, { padding: 0 }]}>
                                    <View style={{ flexDirection: 'row', minHeight: 14 }}>
                                        <View
                                            style={{
                                                flex: 1,
                                                borderRightWidth: 0.8,
                                                borderColor: '#000',
                                                backgroundColor: '#f0f0f0',
                                            }}
                                        />
                                        <View style={{ flex: 1, backgroundColor: '#f0f0f0' }} />
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                </Page>
            </Document>
        );
    };

    return PackingPlantDocument;
}

import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { format } from 'date-fns';

interface Absence {
    id: string;
    absence_type: string;
    from_date: string;
    to_date: string;
    days: number;
    is_partial_day: boolean;
    status: string;
    reason: string;
    submitted_at: string;
    approved_at: string | null;
    hr_approved_at: string | null;
    employee_name: string;
    employeeid: string;
    department: string;
    position: string;
    picture: string | null;
    supervisor_approver: { id: number; name: string } | null;
    hr_approver: { id: number; name: string } | null;
}

interface AbsenceFormPDFProps {
    absence: Absence;
    hrEmployeeName: string;
}

const styles = StyleSheet.create({
    page: {
        backgroundColor: '#fff',
        padding: 40,
        fontFamily: 'Helvetica',
        fontSize: 10,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    companyName: {
        fontSize: 9,
        textAlign: 'center',
        marginBottom: 2,
    },
    companyNameBold: {
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 2,
    },
    acronym: {
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 2,
    },
    address: {
        fontSize: 9,
        textAlign: 'center',
        marginBottom: 8,
    },
    separator: {
        borderBottomWidth: 1,
        borderColor: '#000',
        marginBottom: 20,
    },
    title: {
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    recipientSection: {
        marginBottom: 15,
    },
    recipientRow: {
        flexDirection: 'row',
        marginBottom: 8,
        alignItems: 'flex-start',
    },
    recipientLabel: {
        fontSize: 10,
        width: 60,
    },
    recipientLine: {
        flex: 1,
        borderBottomWidth: 0.8,
        borderColor: '#000',
        marginLeft: 10,
        height: 15,
    },
    bodyText: {
        fontSize: 10,
        marginBottom: 15,
        lineHeight: 1.6,
    },
    bodyTextInline: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'baseline',
    },
    inlineBlank: {
        borderBottomWidth: 0.8,
        borderColor: '#000',
        minWidth: 100,
        marginHorizontal: 4,
        height: 12,
        display: 'inline-block',
    },
    blankWithText: {
        borderBottomWidth: 0.8,
        borderColor: '#000',
        minWidth: 100,
        marginHorizontal: 4,
        paddingBottom: 2,
        minHeight: 12,
    },
    reasonLine: {
        borderBottomWidth: 0.8,
        borderColor: '#000',
        marginTop: 8,
        marginBottom: 8,
        minHeight: 15,
    },
    closing: {
        fontSize: 10,
        marginTop: 20,
    },
});

export default function AbsenceFormPDF({ absence, hrEmployeeName }: AbsenceFormPDFProps) {
    // Format date for display
    const formatDate = (dateString: string): string => {
        try {
            return format(new Date(dateString), 'MMMM dd, yyyy');
        } catch {
            return dateString;
        }
    };

    // Calculate resume date (day after to_date)
    const getResumeDate = (): string => {
        try {
            const toDate = new Date(absence.to_date);
            toDate.setDate(toDate.getDate() + 1);
            return format(toDate, 'MMMM dd, yyyy');
        } catch {
            return '';
        }
    };

    // Split reason into lines
    const reasonLines = absence.reason ? absence.reason.split('\n').filter((line) => line.trim()) : [];
    const displayLines = Math.max(1, reasonLines.length);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.companyName}>Checkered Farms Agrarian Reform Beneficiaries</Text>
                    <Text style={styles.companyNameBold}>Multi Purpose Cooperative</Text>
                    <Text style={styles.acronym}>CFARBEMPCO</Text>
                    <Text style={styles.address}>Purok 3, Tibungol, Panabo City, Davao del Norte</Text>
                </View>

                {/* Separator */}
                <View style={styles.separator} />

                {/* Title */}
                <Text style={styles.title}>ABSENT FROM</Text>

                {/* Recipient Section */}
                <View style={styles.recipientSection}>
                    <View style={styles.recipientRow}>
                        <Text style={styles.recipientLabel}>TO :</Text>
                        <View style={styles.recipientLine} />
                    </View>
                    <View style={styles.recipientRow}>
                        <Text style={styles.recipientLabel}>FROM :</Text>
                        <View style={[styles.recipientLine, { flex: 1 }]}>
                            <Text style={{ fontSize: 9, marginLeft: 4, marginTop: 2 }}>{absence.employee_name}</Text>
                        </View>
                    </View>
                    <View style={styles.recipientRow}>
                        <Text style={styles.recipientLabel}>DATE :</Text>
                        <View style={[styles.recipientLine, { flex: 1 }]}>
                            <Text style={{ fontSize: 9, marginLeft: 4, marginTop: 2 }}>{formatDate(absence.submitted_at)}</Text>
                        </View>
                    </View>
                </View>

                {/* Body Text */}
                <View style={styles.bodyText}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8, flexWrap: 'wrap' }}>
                        <Text>This is to inform you that </Text>
                        <View style={{ borderBottomWidth: 0.8, borderColor: '#000', width: 120, height: 12, marginLeft: 4 }} />
                    </View>
                    <Text style={{ marginBottom: 8 }}>file a leave of absence</Text>
                    <View style={{ marginTop: 8, marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4, flexWrap: 'wrap' }}>
                            <Text>for </Text>
                            <View style={{ borderBottomWidth: 0.8, borderColor: '#000', width: 60, height: 12, marginLeft: 4, marginRight: 4 }}>
                                <Text style={{ fontSize: 9, marginLeft: 2 }}>{absence.days}</Text>
                            </View>
                            <Text> days from </Text>
                            <View style={{ borderBottomWidth: 0.8, borderColor: '#000', width: 100, height: 12, marginLeft: 4, marginRight: 4 }}>
                                <Text style={{ fontSize: 9, marginLeft: 2 }}>{formatDate(absence.from_date)}</Text>
                            </View>
                            <Text> to </Text>
                            <View style={{ borderBottomWidth: 0.8, borderColor: '#000', width: 100, height: 12, marginLeft: 4, marginRight: 4 }}>
                                <Text style={{ fontSize: 9, marginLeft: 2 }}>{formatDate(absence.to_date)}</Text>
                            </View>
                            <Text> for the</Text>
                        </View>
                    </View>
                    <Text style={{ marginTop: 8 }}>following reason/s</Text>
                </View>

                {/* Reason Lines */}
                <View style={{ marginTop: 8, marginBottom: 15 }}>
                    {Array.from({ length: displayLines }).map((_, index) => {
                        const lineText = reasonLines[index] || '';
                        return (
                            <View key={index} style={styles.reasonLine}>
                                {lineText ? <Text style={{ fontSize: 9, marginLeft: 4, marginTop: 2 }}>{lineText}</Text> : <Text> </Text>}
                            </View>
                        );
                    })}
                </View>

                {/* Resume Work Text */}
                <View style={styles.bodyText}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <Text>Said worker/employee is officially on leave on the date above stated and will resume work on </Text>
                        <View style={{ borderBottomWidth: 0.8, borderColor: '#000', width: 120, height: 12, marginLeft: 4 }}>
                            <Text style={{ fontSize: 9, marginLeft: 2 }}>{getResumeDate()}</Text>
                        </View>
                        <Text>.</Text>
                    </View>
                </View>

                {/* Closing */}
                <View style={styles.closing}>
                    <Text>Thank you,</Text>
                </View>
            </Page>
        </Document>
    );
}

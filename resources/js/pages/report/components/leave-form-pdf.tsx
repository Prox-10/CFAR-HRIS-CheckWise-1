import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { format } from 'date-fns';

interface Leave {
    id: string;
    leave_type: string;
    leave_start_date: string;
    leave_end_date: string;
    leave_days: number;
    status: string;
    leave_reason: string;
    leave_date_reported: string;
    leave_date_approved: string | null;
    leave_comments: string | null;
    employee_name: string;
    employeeid: string;
    department: string;
    position: string;
    picture: string | null;
    supervisor_approver: { id: number; name: string } | null;
    hr_approver: { id: number; name: string } | null;
}

interface LeaveFormPDFProps {
    leave: Leave;
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
    bodyText: {
        fontSize: 10,
        marginBottom: 15,
        lineHeight: 1.5,
    },
    reasonLines: {
        marginTop: 8,
        marginBottom: 15,
    },
    reasonLine: {
        borderBottomWidth: 0.8,
        borderColor: '#000',
        marginBottom: 8,
        paddingBottom: 2,
        minHeight: 15,
    },
    reasonText: {
        fontSize: 9,
        marginBottom: 2,
    },
    signatureSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 40,
    },
    signatureBox: {
        width: '45%',
    },
    signatureLabel: {
        fontSize: 10,
        marginBottom: 30,
    },
    signatureLine: {
        borderBottomWidth: 0.8,
        borderColor: '#000',
        marginBottom: 4,
        height: 1,
    },
});

export default function LeaveFormPDF({ leave }: LeaveFormPDFProps) {
    // Format leave type for the form
    const getLeaveTypeText = (type: string): string => {
        const typeMap: Record<string, string> = {
            'Vacation Leave': 'Vacation Leave',
            'Sick Leave': 'Sick Leave',
            'Emergency Leave': 'Emergency Leave',
            Voluntary: 'Voluntary',
            Resignation: 'Resignation',
        };
        return typeMap[type] || type;
    };

    // Format date for display
    const formatDate = (dateString: string): string => {
        try {
            return format(new Date(dateString), 'MMMM dd, yyyy');
        } catch {
            return dateString;
        }
    };

    // Split reason into lines for display
    const reasonLines = leave.leave_reason ? leave.leave_reason.split('\n').filter((line) => line.trim()) : [];
    // Ensure at least 3 lines for the form
    const displayLines = Math.max(3, reasonLines.length);

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
                <Text style={styles.title}>LEAVE FORM</Text>

                {/* Body Text */}
                <View style={styles.bodyText}>
                    <Text>
                        I would like to render/apply for request for my {getLeaveTypeText(leave.leave_type)} effective{' '}
                        <Text style={{ textDecoration: 'underline' }}>{leave.leave_days}</Text> days for the following reasons:
                    </Text>
                </View>

                {/* Reason Lines */}
                <View style={styles.reasonLines}>
                    {Array.from({ length: displayLines }).map((_, index) => {
                        const lineText = reasonLines[index] || '';
                        return (
                            <View key={index} style={styles.reasonLine}>
                                {lineText ? <Text style={styles.reasonText}>{lineText}</Text> : <Text style={styles.reasonText}> </Text>}
                            </View>
                        );
                    })}
                </View>

                {/* Signatures */}
                <View style={styles.signatureSection}>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>Prepared by:</Text>
                        <View style={styles.signatureLine} />
                        {leave.employee_name && <Text style={{ fontSize: 9, marginTop: 4 }}>{leave.employee_name}</Text>}
                    </View>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>Approved by:</Text>
                        <View style={styles.signatureLine} />
                        {leave.hr_approver?.name && <Text style={{ fontSize: 9, marginTop: 4 }}>{leave.hr_approver.name}</Text>}
                    </View>
                </View>
            </Page>
        </Document>
    );
}

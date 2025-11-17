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
    department_hr: { id: number; name: string } | null;
    department_manager: { id: number; name: string } | null;
    used_credits: number | null;
    remaining_credits: number | null;
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
        fontSize: 11,
        textAlign: 'center',
        marginBottom: 2,
    },
    companyNameBold: {
        fontSize: 11,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 2,
    },
    acronym: {
        fontSize: 11,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 2,
    },
    address: {
        fontSize: 10,
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
        fontSize: 10,
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
        marginBottom: 4,
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
                        I would like to render/apply for request for my Voluntary / Resignation / Vacation Leave / Emergency Leave / Maternity Leave /
                        Paternity Leave effective <Text style={{ textDecoration: 'underline' }}>{leave.leave_days}</Text> days for the following
                        reasons:
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

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', width: '100%', marginTop: 24 }}>
                    <View style={styles.signatureBox}>
                        {leave.employee_name && <Text style={{ fontSize: 9, marginTop: 4 }}>{leave.employee_name}</Text>}
                        <View style={styles.signatureLine} />
                        <Text style={{ fontSize: 9, marginTop: 4 }}>Name & Signature of Employee</Text>
                    </View>
                </View>

                {/* Credits Section */}
                <View style={{ marginTop: 24, width: '100%' }}>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 6 }}>CREDITS:</Text>
                    {/* Table Header */}
                    <View style={{ flexDirection: 'row', borderBottomColor: '#666', paddingBottom: 3 }}>
                        <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ fontSize: 9, fontWeight: 'bold' }}>LEAVE TYPE</Text>
                            
                            <Text style={{ fontSize: 9, fontWeight: 'bold', marginLeft: 45 }}>No. OF DAY</Text>
                        </View>
                        <View style={{ flex: 2, alignItems: 'center' }}>
                            <Text style={{ fontSize: 9, fontWeight: 'bold' }}>LEAVE CREDITS TO BE TAKEN</Text>
                        </View>
                        <View style={{ flex: 2, alignItems: 'center' }}>
                            <Text style={{ fontSize: 9, fontWeight: 'bold' }}>EMPLOYEE LEAVE CREDIT BALANCE</Text>
                        </View>
                    </View>
                    {/* Row Example - you may want to replace or repeat for additional rows */}
                    <View style={{ flexDirection: 'row', paddingTop: 4, paddingBottom: 4 }}>
                        <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ fontSize: 9 }}>{leave.leave_type}</Text>
                      
                        
                            <Text style={{ fontSize: 9, fontWeight: 'bold', marginLeft: 85}}>{leave.leave_days}</Text>
                        </View>
                        <View style={{ flex: 2, alignItems: 'center' }}>
                            <Text style={{ fontSize: 9 }}>{leave.used_credits !== null ? leave.used_credits : '-'}</Text>
                        </View>
                        <View style={{ flex: 2, alignItems: 'center' }}>
                            <Text style={{ fontSize: 9 }}>{leave.remaining_credits !== null ? leave.remaining_credits : '-'}</Text>
                        </View>
                    </View>
                    {/* Date Reg, Year Applicable Section */}
                    <View style={{ flexDirection: 'row', marginTop: 12, marginBottom: 6 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11 }}>
                                Date Reg:{' '}
                                <Text style={{ fontWeight: 'bold' }}>
                                    {leave.leave_date_reported ? format(new Date(leave.leave_date_reported), 'yyyy-MM-dd') : '-'}
                                </Text>
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 10 }}>
                                Year Applicable:{' '}
                                <Text style={{ fontWeight: 'bold' }}>
                                    {leave.leave_start_date ? format(new Date(leave.leave_start_date), 'yyyy') : '-'}
                                </Text>
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Signatures */}
                <View style={styles.signatureSection}>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>Prepared by:</Text>
                        {leave.hr_approver?.name && <Text style={{ fontSize: 10}}>{leave.hr_approver.name}</Text>}
                        <View style={styles.signatureLine} />
                    </View>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>Approved by:</Text>
                        {leave.department_manager?.name && <Text style={{ fontSize: 10 }}>{leave.department_manager.name}</Text>}
                        <View style={styles.signatureLine} />
                    </View>
                </View>
            </Page>
        </Document>
    );
}

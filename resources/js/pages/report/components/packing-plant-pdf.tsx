import { Table, TD, TH, TR } from '@ag-media/react-pdf-table';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

interface Evaluation {
    id: number;
    employee_id: number;
    employee_name: string;
    employeeid: string;
    department: string;
    position: string;
    picture: string | null;
    rating_date: string | null;
    evaluation_year: number | null;
    evaluation_period: number | null;
    period_label: string | null;
    total_rating: number | null;
    evaluator: string | null;
    observations: string | null;
    department_supervisor: { id: number; name: string } | null;
    department_manager: { id: number; name: string } | null;
    hr_personnel: { id: number; name: string } | null;
    attendance: {
        days_late: number;
        days_absent: number;
        rating: number;
        remarks: string | null;
    } | null;
    attitudes: {
        supervisor_rating: number;
        supervisor_remarks: string | null;
        coworker_rating: number;
        coworker_remarks: string | null;
    } | null;
    workAttitude: {
        responsible: number;
        job_knowledge: number;
        cooperation: number;
        initiative: number;
        dependability: number;
        remarks: string | null;
    } | null;
    workFunctions: Array<{
        function_name: string;
        work_quality: number;
        work_efficiency: number;
    }>;
}

interface PackingPlantPDFProps {
    evaluation: Evaluation;
}

const styles = StyleSheet.create({
    page: {
        backgroundColor: '#fff',
        padding: 30,
        fontFamily: 'Helvetica',
        fontSize: 9,
        position: 'relative',
    },
    content: {
        position: 'relative',
        zIndex: 1,
    },
    header: {
        alignItems: 'center',
        marginBottom: 15,
    },
    companyName: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 5,
        letterSpacing: 1,
    },
    title: {
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    employeeInfo: {
        flexDirection: 'row',
        marginBottom: 15,
        gap: 20,
    },
    employeeInfoLeft: {
        flex: 1,
    },
    employeeInfoRight: {
        flex: 1,
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        paddingTop: 5,
    },
    employeeInfoRow: {
        flexDirection: 'row',
        marginBottom: 5,
        alignItems: 'center',
    },
    employeeInfoLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        width: 100,
    },
    employeeInfoValue: {
        fontSize: 9,
        width: '30%',
        borderBottomWidth: 0.8,
        borderColor: '#000',
        marginLeft: 10,
        minHeight: 15,
    },
    departmentLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        textAlign: 'right',
    },
    table: {
        marginBottom: 10,
    },
    observationsSection: {
        marginTop: 10,
        marginBottom: 10,
    },
    observationsLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    observationsBox: {
        borderWidth: 1,
        borderColor: '#000',
        minHeight: 60,
        padding: 5,
    },
    observationsText: {
        fontSize: 8,
        lineHeight: 1.4,
    },
    signatureSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    signatureBox: {
        width: '30%',
    },
    signatureLabel: {
        fontSize: 8,
        marginBottom: 3,
    },
    signatureName: {
        fontSize: 9,
        fontWeight: 'bold',
        minHeight: 15,
        textDecoration: 'underline',
    },
    signatureTitle: {
        fontSize: 8,
        marginTop: 2,
    },
    legend: {
        marginTop: 15,
        padding: 5,
        borderWidth: 1,
        borderColor: '#000',
    },
    legendTitle: {
        fontSize: 8,
        fontWeight: 'bold',
        marginBottom: 3,
    },
    legendItem: {
        fontSize: 7,
        marginBottom: 2,
    },
});

export default function PackingPlantPDF({ evaluation }: PackingPlantPDFProps) {
    // Format rating
    const formatRating = (rating: number | null | string | undefined): string => {
        if (rating === null || rating === undefined || rating === '') return '-';
        const numRating = typeof rating === 'string' ? parseFloat(rating) : rating;
        if (isNaN(numRating)) return '-';
        return numRating.toFixed(1);
    };

    // Capitalize name
    const capitalizeName = (name: string | null | undefined): string => {
        if (!name || typeof name !== 'string') {
            return '';
        }
        return name.trim().toUpperCase();
    };

    // Calculate work attitude average
    const workAttitudeAvg = evaluation.workAttitude
        ? (evaluation.workAttitude.responsible +
              evaluation.workAttitude.job_knowledge +
              evaluation.workAttitude.cooperation +
              evaluation.workAttitude.initiative +
              evaluation.workAttitude.dependability) /
          5
        : 0;

    // Packing Plant work operations list
    const packingPlantOperations = [
        'PATIO',
        'DEHANDER',
        'SELECTOR',
        'REJECTOR/UTILITY',
        'WEIGHER',
        'INSPECTOR',
        'CREW',
        'PACKER',
        'BOX FORMER',
        'BOXES COUNTER',
        'PALLETIZER',
    ];

    // Get work function by name
    const getWorkFunction = (functionName: string) => {
        return evaluation.workFunctions?.find((wf) => wf.function_name.toUpperCase() === functionName.toUpperCase());
    };

    return (
        <Document>
            <Page size="LEGAL" style={styles.page}>
                {/* Content */}
                <View style={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.companyName}>CFARBEMPCO</Text>
                        <Text style={styles.title}>WORKERS EVALUATION</Text>
                    </View>

                    {/* Employee Information */}
                    <View style={styles.employeeInfo}>
                        <View style={styles.employeeInfoLeft}>
                            <View style={styles.employeeInfoRow}>
                                <Text style={styles.employeeInfoLabel}>DEPARTMENT:</Text>
                                <Text style={styles.employeeInfoValue}>{evaluation.department || 'PACKING PLANT'}</Text>
                            </View>
                            <View style={styles.employeeInfoRow}>
                                <Text style={styles.employeeInfoLabel}>NAME OF WORKER:</Text>
                                <Text style={styles.employeeInfoValue}>{capitalizeName(evaluation.employee_name)}</Text>
                            </View>
                            <View style={styles.employeeInfoRow}>
                                <Text style={styles.employeeInfoLabel}>EMPLOYMENT STATUS:</Text>
                                <Text style={styles.employeeInfoValue}>{evaluation.position || ''}</Text>
                            </View>
                        </View>
                        <View style={styles.employeeInfoRight}>
                            <Text style={styles.departmentLabel}>PACKING PLANT</Text>
                        </View>
                    </View>

                    {/* Evaluation Table */}
                    <Table style={styles.table}>
                        {/* Table Header */}
                        <TH>
                            <TD style={{ justifyContent: 'center', padding: 5, maxWidth: 118, minWidth: 119 }}>CRITERIA</TD>
                            <TD style={{ minWidth: 41 }}></TD>
                            <TD style={{ justifyContent: 'center', minWidth: 130 }}>RATING (1-10)</TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}>TOTAL/AVG VG</TD>
                            <TD style={{ justifyContent: 'center' }}>REMARKS</TD>
                        </TH>

                        {/* 1. ATTENDANCE */}
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, maxWidth: 118, minWidth: 119 }}>1. ATTENDANCE</TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>LATE</TD>
                            <TD style={{ minWidth: 130, justifyContent: 'center' }}>{formatRating(evaluation.attendance?.rating)}</TD>

                            <TD style={{ maxWidth: 60, justifyContent: 'center' }}>{evaluation.attendance?.days_late || 0}</TD>
                            <TD style={{ justifyContent: 'center' }}>{evaluation.attendance?.remarks || ''}</TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}>
                                FORMULA(NO DAYS LATE OR ABSENT /24X10)-10 = RATING
                            </TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>ABSENT</TD>

                            <TD style={{ minWidth: 130, justifyContent: 'center' }}></TD>
                            <TD style={{ maxWidth: 60, justifyContent: 'center' }}>{evaluation.attendance?.days_absent || 0}</TD>
                            <TD style={{ justifyContent: 'center' }}></TD>
                        </TR>

                        {/* 2. ATTITUDE TOWARDS SUPERVISOR */}
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}>2. ATTITUDE TOWARDS SUPERVISOR</TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}></TD>

                            <TD style={{ minWidth: 130, justifyContent: 'center' }}></TD>
                            <TD style={{ maxWidth: 60, justifyContent: 'center' }}></TD>
                            <TD style={{ justifyContent: 'center' }}>{evaluation.attitudes?.supervisor_remarks || ''}</TD>
                        </TR>

                        {/* 3. ATTITUDE TOWARDS CO-WORKER */}
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}>3. ATTITUDE TOWARDS CO-WORKER</TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}></TD>

                            <TD style={{ minWidth: 130, justifyContent: 'center' }}></TD>
                            <TD style={{ maxWidth: 60, justifyContent: 'center' }}></TD>
                            <TD style={{ justifyContent: 'center' }}>{evaluation.attitudes?.coworker_remarks || ''}</TD>
                        </TR>

                        {/* 4. WORK ATTITUDE/PERFORMANCE */}
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}>4. WORK ATTITUDE/PERFORMANCE</TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>RESPONSIBLE IN WORK ASSIGNMENT</TD>
                            <TD style={{ minWidth: 130, justifyContent: 'center' }}>{formatRating(evaluation.workAttitude?.responsible)}</TD>

                            <TD style={{ maxWidth: 60, justifyContent: 'center' }}>{formatRating(workAttitudeAvg)}</TD>
                            <TD>{evaluation.workAttitude?.remarks || ''}</TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>WORK INITIATIVE</TD>
                            <TD style={{ minWidth: 130, justifyContent: 'center' }}>{formatRating(evaluation.workAttitude?.initiative)}</TD>

                            <TD style={{ maxWidth: 60, justifyContent: 'center' }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>JOB KNOWLEDGE</TD>
                            <TD style={{ minWidth: 130, justifyContent: 'center' }}>{formatRating(evaluation.workAttitude?.job_knowledge)}</TD>

                            <TD style={{ maxWidth: 60, justifyContent: 'center' }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>DEPENDABILITY</TD>
                            <TD style={{ minWidth: 130, justifyContent: 'center' }}>{formatRating(evaluation.workAttitude?.dependability)}</TD>

                            <TD style={{ maxWidth: 60, justifyContent: 'center' }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>COOPERATION</TD>
                            <TD style={{ minWidth: 130, justifyContent: 'center' }}>{formatRating(evaluation.workAttitude?.cooperation)}</TD>

                            <TD style={{ maxWidth: 60, justifyContent: 'center' }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 228, maxWidth: 228 }}></TD>
                            <TD style={{ maxWidth: 199, minWidth: 199, justifyContent: 'center' }}>RATING</TD>
                            <TD style={{ maxWidth: 120, minWidth: 130, justifyContent: 'center' }}></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 228, maxWidth: 228 }}></TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>WORK QUALITY</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>EFFECIENCY</TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 120, minWidth: 130 }}></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}>5. WORK OPERATIONS</TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>PATIO</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>
                                {formatRating(getWorkFunction('PATIO')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>
                                {formatRating(getWorkFunction('PATIO')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>DEHANDER</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>
                                {formatRating(getWorkFunction('DEHANDER')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>
                                {formatRating(getWorkFunction('DEHANDER')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>SELECTOR</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>
                                {formatRating(getWorkFunction('SELECTOR')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>
                                {formatRating(getWorkFunction('SELECTOR')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}>WTS</TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>REJECTOR/UTILITY</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>
                                {formatRating(getWorkFunction('REJECTOR/UTILITY')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>
                                {formatRating(getWorkFunction('REJECTOR/UTILITY')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>WEIGHER</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>
                                {formatRating(getWorkFunction('WEIGHER')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>
                                {formatRating(getWorkFunction('WEIGHER')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}>LABELLER</TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>INSPECTOR</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>
                                {formatRating(getWorkFunction('INSPECTOR')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>
                                {formatRating(getWorkFunction('INSPECTOR')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}>CP'S</TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>CREW</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>
                                {formatRating(getWorkFunction('CREW')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>
                                {formatRating(getWorkFunction('CREW')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>PACKER</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>
                                {formatRating(getWorkFunction('PACKER')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>
                                {formatRating(getWorkFunction('PACKER')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}>TOPPER</TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>BOX FORMER</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>
                                {formatRating(getWorkFunction('BOX FORMER')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>
                                {formatRating(getWorkFunction('BOX FORMER')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}>FINAL WEIGHER</TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>BOXES COUNTER</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>
                                {formatRating(getWorkFunction('BOXES COUNTER')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>
                                {formatRating(getWorkFunction('BOXES COUNTER')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}>BOX FORMER</TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>PALLETIZER</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>
                                {formatRating(getWorkFunction('PALLETIZER')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}>
                                {formatRating(getWorkFunction('PALLETIZER')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        {/* TOTAL RATING */}

                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 426, maxWidth: 426, justifyContent: 'center' }}>TOTAL RATING</TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60, minWidth: 60 }}>{formatRating(evaluation.total_rating)}</TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 71, minWidth: 71 }}></TD>
                        </TR>
                    </Table>

                    {/* OBSERVATIONS/COMMENTS */}
                    <View style={styles.observationsSection}>
                        <Text style={styles.observationsLabel}>OBSERVATIONS/COMMENTS:</Text>
                        <View style={styles.observationsBox}>
                            <Text style={styles.observationsText}>{evaluation.observations || ''}</Text>
                        </View>
                    </View>

                    {/* Signatures - Three columns */}
                    <View style={styles.signatureSection}>
                        <View style={styles.signatureBox}>
                            <Text style={styles.signatureLabel}>EVALUATED BY:</Text>
                            {evaluation.department_supervisor?.name && (
                                <Text style={styles.signatureName}>{capitalizeName(evaluation.department_supervisor.name)}</Text>
                            )}
                            <Text style={styles.signatureTitle}>Packing Plant Supervisor / PP Asst. Supervisor</Text>
                        </View>
                        <View style={styles.signatureBox}>
                            <Text style={styles.signatureLabel}>NOTED BY:</Text>
                            {evaluation.hr_personnel?.name && (
                                <Text style={styles.signatureName}>{capitalizeName(evaluation.hr_personnel.name)}</Text>
                            )}
                            <Text style={styles.signatureTitle}>HR PERSONNEL</Text>
                        </View>
                        <View style={styles.signatureBox}>
                            <Text style={styles.signatureLabel}>APPROVED BY:</Text>
                            {evaluation.department_manager?.name && (
                                <Text style={styles.signatureName}>{capitalizeName(evaluation.department_manager.name)}</Text>
                            )}
                            <Text style={styles.signatureTitle}>MANAGER</Text>
                        </View>
                    </View>

                    {/* Legend */}
                    <Table style={styles.legend}>
                        <TH>
                            <TD>LEGEND:</TD>
                        </TH>
                        <TR>
                            <TD>1-4: Fail</TD>
                            <TD>5-7: Satisfactory</TD>
                            <TD>8-9: Very Satisfactory</TD>
                            <TD>10: Excellent</TD>
                        </TR>
                    </Table>
                </View>
            </Page>
        </Document>
    );
}

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

interface AdminPDFProps {
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
    backgroundLogo: {
        position: 'absolute',
        top: 200,
        left: 50,
        width: 500,
        height: 500,
        opacity: 0.02,
        zIndex: 0,
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

        // Option 2: Use fixed pixel width (uncomment and adjust as needed)
        // width: 250,

        // Option 3: Use flex with maxWidth (uncomment and adjust)
        // flex: 1,
        // maxWidth: 250,

        borderBottomWidth: 0.8,
        borderColor: '#000',
        marginLeft: 10,
        minHeight: 15,
    },
    table: {
        marginBottom: 10,
    },
    tableHeaderCell: {
        fontSize: 8,
        fontWeight: 'bold',
        textAlign: 'center',
        paddingVertical: 4,
        paddingHorizontal: 2,
        backgroundColor: '#f0f0f0',
    },
    tableCell: {
        fontSize: 8,
        paddingHorizontal: 3,
        paddingVertical: 3,
    },
    tableCellCriteria: {
        fontSize: 8,
        textAlign: 'left',
    },
    tableCellRating: {
        fontSize: 8,
        textAlign: 'center',
    },
    tableCellTotal: {
        fontSize: 8,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    tableCellRemarks: {
        fontSize: 7,
        textAlign: 'left',
    },
    subRow: {
        paddingLeft: 15,
        fontSize: 7,
    },
    formulaText: {
        fontSize: 6,
        fontStyle: 'italic',
        paddingLeft: 15,
        marginTop: 2,
    },
    boldText: {
        fontWeight: 'bold',
    },
    totalRatingText: {
        fontWeight: 'bold',
        fontSize: 10,
        textAlign: 'left',
    },
    totalRatingValue: {
        fontWeight: 'bold',
        fontSize: 10,
        textAlign: 'center',
    },
    workFunctionHeader: {
        fontSize: 7,
        textAlign: 'center',
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
        width: '45%',
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
    ratingSubCell: {
        flexDirection: 'row',
        width: '100%',
    },
    ratingSubCellLeft: {
        flex: 1,
        borderRightWidth: 1,
        borderColor: '#000',
        padding: 2,
        justifyContent: 'center',
    },
    ratingSubCellRight: {
        flex: 1,
        padding: 2,
        justifyContent: 'center',
    },
});

export default function AdminPDF({ evaluation }: AdminPDFProps) {
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

    // Calculate work functions average
    const workFunctionsAvg =
        evaluation.workFunctions && evaluation.workFunctions.length > 0
            ? evaluation.workFunctions.reduce((sum, func) => {
                  const avg = (func.work_quality + func.work_efficiency) / 2;
                  return sum + avg;
              }, 0) / evaluation.workFunctions.length
            : 0;

    return (
        <Document>
            <Page size="LEGAL" style={styles.page}>
                {/* Background Logo removed to prevent WebAssembly memory issues */}

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
                                <Text style={styles.employeeInfoValue}>{evaluation.department || 'ADMIN'}</Text>
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
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>Late</TD>
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
                            <TD style={{ minWidth: 130, justifyContent: 'center' }}>{formatRating(evaluation.attitudes?.supervisor_rating)}</TD>
                            <TD style={{ maxWidth: 60, justifyContent: 'center' }}>{evaluation.attitudes?.supervisor_remarks || ''}</TD>
                            <TD></TD>
                        </TR>

                        {/* 3. ATTITUDE TOWARDS CO-WORKER */}
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}>3. ATTITUDE TOWARDS CO-WORKER</TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}></TD>
                            <TD style={{ minWidth: 130, justifyContent: 'center' }}>{formatRating(evaluation.attitudes?.coworker_rating)}</TD>
                            <TD style={{ maxWidth: 60, justifyContent: 'center' }}>{evaluation.attitudes?.coworker_remarks || ''}</TD>
                            <TD></TD>
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
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}>5. WORK FUNCTIONS</TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>
                                ENCODE WORKERS DAILY TIME & ACCOMPLISHMENT REPORT (WDTAR)
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}></TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}></TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>
                                PREPARE THE PAYROLL OF PERIODIC PAID EMPLOYEES, COOP LEAVE, HONORARIUM AND HIRED WORKERS
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}></TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}></TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>
                                MAINTAIN FILES OF TIMESHEETS AND OTHER SOURCE DOCUMENTS
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}></TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}></TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>
                                UPDATE GENERATION OF DOCUMENTS IN ORDER TO CATCH UP WITH THE REMITTANCE/PAYMENTS SCHEDULES
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}></TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}></TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>
                                PREPARE AND FURNISH THE BOOKKEEPER SUMMARY OF BENEFICIARY'S DEDUCTIONS MADE AGAINTS THEIR RESPECTIVE PROCEEDS
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}></TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}></TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>
                                PREPARE INDIVIDUAL BILLING OF BENEFICIARIEW BASED ON THE INDIVIDUAL PRODUTION REPORT SUMMARY SUBMITTED BY THE AGRI &
                                PROD. FACILATATOR
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}></TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}></TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>
                                PERFORM OTHER DUTIES AS MAY BE ASSIGNED BY HIS/HER IMMEDIATE SUPERIOR AND NOR THE MANAGER
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}></TD>
                            <TD style={{ justifyContent: 'center', minWidth: 100, maxWidth: 100 }}></TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        {/* TOTAL RATING - Inside table, spans CRITERIA and RATING columns */}
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

                    {/* Signatures */}
                    <View style={styles.signatureSection}>
                        <View style={styles.signatureBox}>
                            <Text style={styles.signatureLabel}>EVALUATED BY:</Text>
                            {evaluation.department_supervisor?.name && (
                                <Text style={styles.signatureName}>{capitalizeName(evaluation.department_supervisor.name)}</Text>
                            )}
                            <Text style={styles.signatureTitle}>SUPERVISOR</Text>
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
                            <TD>LEGEND:</TD>
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

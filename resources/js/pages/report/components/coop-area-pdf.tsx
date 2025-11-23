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
    place_of_assignment?: string | null;
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

interface CoopAreaPDFProps {
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
        width: 120,
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

export default function CoopAreaPDF({ evaluation }: CoopAreaPDFProps) {
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

    // Coop Area work operations
    const plantCareOperations = ['WEED CONTROL', 'CLEANING/CUTTING STUMPS', 'PRUNING', 'REPLANTING', 'FERTILIZER APPLICATION', 'PROPPING'];
    const fruitCareOperations = ['BUD BAGGING', 'CALOCO/DE & D', 'BUNCH SPRAY', 'BAGGING', 'HAND BAGGING/SOKSOK', 'DE-SAFING', 'SIGATOKA TRIMMING'];
    const pestDiseaseOperations = ['MOKO ERADICATION', 'FUSARIUM ERADICATION', 'SCALE INSECT/MEALY BUG', 'BUNCHY TOP ERADICATION'];

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
                                <Text style={styles.employeeInfoValue}>{evaluation.department || 'COOP AREA'}</Text>
                            </View>
                            <View style={styles.employeeInfoRow}>
                                <Text style={styles.employeeInfoLabel}>NAME OF WORKER:</Text>
                                <Text style={styles.employeeInfoValue}>{capitalizeName(evaluation.employee_name)}</Text>
                            </View>
                            <View style={styles.employeeInfoRow}>
                                <Text style={styles.employeeInfoLabel}>POSITION/OPERATION:</Text>
                                <Text style={styles.employeeInfoValue}>{evaluation.position || ''}</Text>
                            </View>
                            <View style={styles.employeeInfoRow}>
                                <Text style={styles.employeeInfoLabel}>PLACE OF ASSIGNMENT:</Text>
                                <Text style={styles.employeeInfoValue}>{evaluation.place_of_assignment || ''}</Text>
                            </View>
                        </View>
                        <View style={styles.employeeInfoRight}>
                            <Text style={styles.departmentLabel}>COOP AREA</Text>
                        </View>
                    </View>

                    {/* Evaluation Table */}
                    <Table style={styles.table}>
                        {/* Table Header */}
                        <TH>
                            <TD style={{ justifyContent: 'center', padding: 5, maxWidth: 118, minWidth: 119 }}>CRITERIA</TD>
                            <TD style={{ minWidth: 41 }}></TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65 }}>RATING</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65 }}>1-10</TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}>TOTAL/AVERAGE</TD>
                            <TD style={{ justifyContent: 'center' }}>REMARKS</TD>
                        </TH>

                        {/* 1. ATTENDANCE */}
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, maxWidth: 118, minWidth: 119 }}>1. ATTENDANCE</TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>LATE</TD>
                            <TD style={{ minWidth: 65, maxWidth: 65, justifyContent: 'center' }}>{formatRating(evaluation.attendance?.rating)}</TD>
                            <TD style={{ minWidth: 65, maxWidth: 65, justifyContent: 'center' }}></TD>
                            <TD style={{ maxWidth: 60, justifyContent: 'center' }}>{evaluation.attendance?.days_late || 0}</TD>
                            <TD style={{ justifyContent: 'center' }}>{evaluation.attendance?.remarks || ''}</TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}>
                                FORMULA(NO DAYS LATE OR ABSENT /24X10)-10 = RATING
                            </TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>ABSENT</TD>
                            <TD style={{ minWidth: 65, maxWidth: 65, justifyContent: 'center' }}></TD>
                            <TD style={{ minWidth: 65, maxWidth: 65, justifyContent: 'center' }}></TD>
                            <TD style={{ maxWidth: 60, justifyContent: 'center' }}>{evaluation.attendance?.days_absent || 0}</TD>
                            <TD style={{ justifyContent: 'center' }}></TD>
                        </TR>

                        {/* 2. ATTITUDE TOWARDS ARS */}
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}>2. ATTITUDE TOWARDS ARS</TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}></TD>
                            <TD style={{ minWidth: 65, maxWidth: 65, justifyContent: 'center' }}>
                                {formatRating(evaluation.attitudes?.supervisor_rating)}
                            </TD>
                            <TD style={{ minWidth: 65, maxWidth: 65, justifyContent: 'center' }}></TD>
                            <TD style={{ maxWidth: 60, justifyContent: 'center' }}></TD>
                            <TD style={{ justifyContent: 'center' }}>{evaluation.attitudes?.supervisor_remarks || ''}</TD>
                        </TR>

                        {/* 3. WORK ATTITUDE/PERFORMANCE */}
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}>3. WORK ATTITUDE/PERFORMANCE</TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>RESPONSIBLE IN WORK ASSIGNMENT</TD>
                            <TD style={{ minWidth: 65, maxWidth: 65, justifyContent: 'center' }}>
                                {formatRating(evaluation.workAttitude?.responsible)}
                            </TD>
                            <TD style={{ minWidth: 65, maxWidth: 65, justifyContent: 'center' }}></TD>
                            <TD style={{ maxWidth: 60, justifyContent: 'center' }}>{formatRating(workAttitudeAvg)}</TD>
                            <TD>{evaluation.workAttitude?.remarks || ''}</TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>WORK INITIATIVE</TD>
                            <TD style={{ minWidth: 65, maxWidth: 65, justifyContent: 'center' }}>
                                {formatRating(evaluation.workAttitude?.initiative)}
                            </TD>
                            <TD style={{ minWidth: 65, maxWidth: 65, justifyContent: 'center' }}></TD>
                            <TD style={{ maxWidth: 60, justifyContent: 'center' }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>JOB KNOWLEDGE</TD>
                            <TD style={{ minWidth: 65, maxWidth: 65, justifyContent: 'center' }}>
                                {formatRating(evaluation.workAttitude?.job_knowledge)}
                            </TD>
                            <TD style={{ minWidth: 65, maxWidth: 65, justifyContent: 'center' }}></TD>
                            <TD style={{ maxWidth: 60, justifyContent: 'center' }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>DEPENDABILITY</TD>
                            <TD style={{ minWidth: 65, maxWidth: 65, justifyContent: 'center' }}>
                                {formatRating(evaluation.workAttitude?.dependability)}
                            </TD>
                            <TD style={{ minWidth: 65, maxWidth: 65, justifyContent: 'center' }}></TD>
                            <TD style={{ maxWidth: 60, justifyContent: 'center' }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>COOPERATION</TD>
                            <TD style={{ minWidth: 65, maxWidth: 65, justifyContent: 'center' }}>
                                {formatRating(evaluation.workAttitude?.cooperation)}
                            </TD>
                            <TD style={{ minWidth: 65, maxWidth: 65, justifyContent: 'center' }}></TD>
                            <TD style={{ maxWidth: 60, justifyContent: 'center' }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 228, maxWidth: 228 }}></TD>
                            <TD style={{ maxWidth: 199, minWidth: 199, justifyContent: 'center' }}>RATING</TD>
                            <TD style={{ maxWidth: 65, minWidth: 65, justifyContent: 'center' }}>WORK QUALITY 1-3</TD>
                            <TD style={{ maxWidth: 65, minWidth: 65, justifyContent: 'center' }}>EFFICIENCY 1-10</TD>
                            <TD style={{ maxWidth: 60, justifyContent: 'center' }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}>4. WORK OPERATIONS</TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}></TD>
                            <TD style={{ maxWidth: 65, minWidth: 65, justifyContent: 'center' }}></TD>
                            <TD style={{ maxWidth: 65, minWidth: 65, justifyContent: 'center' }}></TD>
                            <TD style={{ maxWidth: 60, justifyContent: 'center' }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}>PLANT CARE</TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>WEED CONTROL</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('WEED CONTROL')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('WEED CONTROL')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>CLEANING/CUTTING STUMPS</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('CLEANING/CUTTING STUMPS')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('CLEANING/CUTTING STUMPS')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>PRUNING</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('PRUNING')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('PRUNING')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>REPLANTING</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('REPLANTING')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('REPLANTING')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>FERTILIZER APPLICATION</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('FERTILIZER APPLICATION')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('FERTILIZER APPLICATION')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>PROPPING</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('PROPPING')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('PROPPING')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}>FRUIT CARE</TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>BUD BAGGING</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('BUD BAGGING')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('BUD BAGGING')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>CALOCO/DE & D</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('CALOCO/DE & D')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('CALOCO/DE & D')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>BUNCH SPRAY</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('BUNCH SPRAY')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('BUNCH SPRAY')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>BAGGING</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('BAGGING')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('BAGGING')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>HAND BAGGING/SOKSOK</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('HAND BAGGING/SOKSOK')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('HAND BAGGING/SOKSOK')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>DE-SAFING</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('DE-SAFING')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('DE-SAFING')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>SIGATOKA TRIMMING</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('SIGATOKA TRIMMING')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('SIGATOKA TRIMMING')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}>PEST & DISEASE CONTROL/ACTUAL</TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>MOKO ERADICATION</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('MOKO ERADICATION')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('MOKO ERADICATION')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>FUSARIUM ERADICATION</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('FUSARIUM ERADICATION')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('FUSARIUM ERADICATION')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>SCALE INSECT/MEALY BUG</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('SCALE INSECT/MEALY BUG')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('SCALE INSECT/MEALY BUG')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}></TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}>BUNCHY TOP ERADICATION</TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('BUNCHY TOP ERADICATION')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('BUNCHY TOP ERADICATION')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118 }}>OHCP/ACTUAL</TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}></TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('OHCP/ACTUAL')?.work_quality)}
                            </TD>
                            <TD style={{ justifyContent: 'center', minWidth: 65, maxWidth: 65 }}>
                                {formatRating(getWorkFunction('OHCP/ACTUAL')?.work_efficiency)}
                            </TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60 }}></TD>
                            <TD></TD>
                        </TR>
                        {/* TOTAL RATING */}
                        <TR>
                            <TD style={{ paddingLeft: 5, paddingRight: 5, minWidth: 119, maxWidth: 118, justifyContent: 'center' }}>TOTAL RATING</TD>
                            <TD style={{ maxWidth: 110, minWidth: 110, justifyContent: 'center' }}></TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 65, minWidth: 65 }}></TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 65, minWidth: 65 }}></TD>
                            <TD style={{ justifyContent: 'center', maxWidth: 60, minWidth: 60 }}>{formatRating(evaluation.total_rating)}</TD>
                            <TD style={{ justifyContent: 'center' }}></TD>
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
                            <Text style={styles.signatureTitle}>Farm Supervisor</Text>
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

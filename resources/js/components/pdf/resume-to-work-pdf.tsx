import { Document, Image, Page, PDFDownloadLink, PDFViewer, StyleSheet, Text, View } from '@react-pdf/renderer';

const pdfStyles = StyleSheet.create({
    page: {
        backgroundColor: '#fff',
        color: '#262626',
        fontFamily: 'Helvetica',
        fontSize: 12,
        paddingTop: 30,
        paddingBottom: 30,
        paddingLeft: 50,
        paddingRight: 50,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
    },
    textBold: {
        fontFamily: 'Helvetica-Bold',
    },
    textSmall: {
        fontSize: 10,
        color: '#666',
    },
    section: {
        marginBottom: 20,
        padding: 12,
        backgroundColor: '#f9f9f9',
        borderRadius: 4,
    },
    sectionTitle: {
        fontSize: 16,
        marginBottom: 12,
        color: '#333',
    },
    row: {
        flexDirection: 'row',
        marginBottom: 8,
        alignItems: 'center',
    },
    label: {
        width: '40%',
        fontSize: 11,
        color: '#666',
        fontFamily: 'Helvetica-Bold',
    },
    value: {
        width: '60%',
        fontSize: 11,
        color: '#333',
    },
});

function formatDate(date: string | Date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

interface ResumeToWorkPDFProps {
    request: {
        id: string;
        employee_name: string;
        employee_id: string;
        employee_id_number?: string;
        department: string;
        position: string;
        return_date: string;
        previous_absence_reference: string;
        comments: string;
        status: 'pending' | 'processed';
        processed_by: string | null;
        processed_at: string | null;
        supervisor_notified: boolean;
        supervisor_notified_at: string | null;
        created_at: string;
    };
}

export default function ResumeToWorkPDF({ request }: ResumeToWorkPDFProps) {
    const ResumeToWorkDocument = () => (
        <Document>
            <Page size="A4" style={pdfStyles.page}>
                {/* Header with logo and company name */}
                <View style={{ ...pdfStyles.header, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <Image src="/Logo.png" style={{ width: 60, height: 60, marginRight: 16 }} />
                        <View>
                            <Text style={[pdfStyles.title, pdfStyles.textBold]}>HRIS (CheckWise)</Text>
                            <Text>Resume to Work Request</Text>
                        </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={pdfStyles.textSmall}>Document ID: {request.id}</Text>
                        <Text style={pdfStyles.textSmall}>Generated: {formatDate(new Date())}</Text>
                    </View>
                </View>

                {/* Status Badge */}
                <View
                    style={{
                        backgroundColor: request.status === 'processed' ? '#d4edda' : '#fff3cd',
                        padding: 8,
                        borderRadius: 4,
                        marginBottom: 16,
                        alignItems: 'center',
                    }}
                >
                    <Text
                        style={{
                            color: request.status === 'processed' ? '#155724' : '#856404',
                            fontWeight: 'bold',
                            fontSize: 12,
                        }}
                    >
                        Status: {request.status.toUpperCase()}
                    </Text>
                </View>

                {/* Employee Information Section */}
                <View style={pdfStyles.section}>
                    <Text style={[pdfStyles.sectionTitle, pdfStyles.textBold]}>Employee Information</Text>
                    <View style={pdfStyles.row}>
                        <Text style={pdfStyles.label}>Employee Name:</Text>
                        <Text style={pdfStyles.value}>{request.employee_name || 'N/A'}</Text>
                    </View>
                    <View style={pdfStyles.row}>
                        <Text style={pdfStyles.label}>Employee ID:</Text>
                        <Text style={pdfStyles.value}>{request.employee_id_number || request.employee_id || 'N/A'}</Text>
                    </View>
                    <View style={pdfStyles.row}>
                        <Text style={pdfStyles.label}>Department:</Text>
                        <Text style={pdfStyles.value}>{request.department || 'N/A'}</Text>
                    </View>
                    <View style={pdfStyles.row}>
                        <Text style={pdfStyles.label}>Position:</Text>
                        <Text style={pdfStyles.value}>{request.position || 'N/A'}</Text>
                    </View>
                </View>

                {/* Return to Work Information */}
                <View style={pdfStyles.section}>
                    <Text style={[pdfStyles.sectionTitle, pdfStyles.textBold]}>Return to Work Details</Text>
                    <View style={pdfStyles.row}>
                        <Text style={pdfStyles.label}>Return Date:</Text>
                        <Text style={pdfStyles.value}>{formatDate(request.return_date)}</Text>
                    </View>
                    {request.previous_absence_reference && (
                        <View style={pdfStyles.row}>
                            <Text style={pdfStyles.label}>Previous Absence Reference:</Text>
                            <Text style={pdfStyles.value}>{request.previous_absence_reference}</Text>
                        </View>
                    )}
                    {request.comments && (
                        <View style={{ ...pdfStyles.row, flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Text style={pdfStyles.label}>Comments:</Text>
                            <Text style={{ ...pdfStyles.value, marginTop: 4 }}>{request.comments}</Text>
                        </View>
                    )}
                </View>

                {/* Processing Information */}
                {request.status === 'processed' && (
                    <View style={pdfStyles.section}>
                        <Text style={[pdfStyles.sectionTitle, pdfStyles.textBold]}>Processing Information</Text>
                        <View style={pdfStyles.row}>
                            <Text style={pdfStyles.label}>Processed By:</Text>
                            <Text style={pdfStyles.value}>{request.processed_by || 'N/A'}</Text>
                        </View>
                        <View style={pdfStyles.row}>
                            <Text style={pdfStyles.label}>Processed At:</Text>
                            <Text style={pdfStyles.value}>{request.processed_at ? formatDate(request.processed_at) : 'N/A'}</Text>
                        </View>
                        <View style={pdfStyles.row}>
                            <Text style={pdfStyles.label}>Supervisor Notified:</Text>
                            <Text style={pdfStyles.value}>{request.supervisor_notified ? 'Yes' : 'No'}</Text>
                        </View>
                        {request.supervisor_notified_at && (
                            <View style={pdfStyles.row}>
                                <Text style={pdfStyles.label}>Notified At:</Text>
                                <Text style={pdfStyles.value}>{formatDate(request.supervisor_notified_at)}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Request Information */}
                <View style={pdfStyles.section}>
                    <Text style={[pdfStyles.sectionTitle, pdfStyles.textBold]}>Request Information</Text>
                    <View style={pdfStyles.row}>
                        <Text style={pdfStyles.label}>Request ID:</Text>
                        <Text style={pdfStyles.value}>{request.id}</Text>
                    </View>
                    <View style={pdfStyles.row}>
                        <Text style={pdfStyles.label}>Submitted At:</Text>
                        <Text style={pdfStyles.value}>{formatDate(request.created_at)}</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={{ marginTop: 32, borderTop: '1px solid #eee', paddingTop: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: '#888' }}>This document was generated automatically by HRIS (CheckWise).</Text>
                    <Text style={{ fontSize: 10, color: '#888' }}>For any questions, please contact the HR department.</Text>
                </View>
            </Page>
        </Document>
    );

    return (
        <div className="mx-auto my-10 max-w-2xl">
            <div className="h-[500px] w-full">
                <PDFViewer width="100%" height="100%">
                    <ResumeToWorkDocument />
                </PDFViewer>
            </div>
            <div className="mt-6 flex justify-center">
                <PDFDownloadLink
                    document={<ResumeToWorkDocument />}
                    fileName={`resume-to-work-${request.employee_id_number || request.employee_id || 'employee'}-${new Date().toISOString().split('T')[0]}.pdf`}
                >
                    {({ blob, url, loading, error }) =>
                        loading ? (
                            <button className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-white transition duration-300 hover:bg-blue-700">
                                Loading document...
                            </button>
                        ) : (
                            <button className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-white transition duration-300 hover:bg-blue-700">
                                Download PDF
                            </button>
                        )
                    }
                </PDFDownloadLink>
            </div>
        </div>
    );
}

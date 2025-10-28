import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import PackingPlantPDF from './packing-plant-pdf';

interface PackingPlantPDFPreviewProps {
    weekStart?: Date;
    workers?: { [key: string]: string[] };
    onClose?: () => void;
}

export default function PackingPlantPDFPreview({ weekStart, workers, onClose }: PackingPlantPDFPreviewProps) {
    // Call PackingPlantPDF as a function to get the Document
    const PackingPlantDocument = PackingPlantPDF({ weekStart, workers });

    return (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
            <div className="relative mx-auto max-w-4xl rounded-lg bg-white p-6 shadow-2xl">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between border-b pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">DAILY CHECKING OF PP CREW</h2>
                        <p className="text-sm text-gray-600">CFARBEMPCO - PP-2701</p>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* PDF Viewer */}
                <div className="h-[600px] w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                    <PDFViewer width="100%" height="100%" style={{ borderRadius: '8px' }}>
                        <PackingPlantDocument />
                    </PDFViewer>
                </div>

                {/* Download Button */}
                <div className="mt-6 flex justify-center">
                    <PDFDownloadLink
                        document={<PackingPlantDocument />}
                        fileName={`packing-plant-daily-checking-${new Date().toISOString().split('T')[0]}.pdf`}
                    >
                        {({ blob, url, loading, error }) => (
                            <button
                                disabled={loading}
                                className="flex items-center gap-2 rounded-md bg-blue-600 px-6 py-3 text-white transition duration-300 hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                        Generating PDF...
                                    </>
                                ) : (
                                    <>
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                        Download PDF
                                    </>
                                )}
                            </button>
                        )}
                    </PDFDownloadLink>
                </div>
            </div>
        </div>
    );
}

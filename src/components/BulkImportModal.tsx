'use client';

import { useState, useRef } from 'react';
import { X, Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface BulkImportModalProps {
    eventId: string;
    onClose: () => void;
    onSuccess: () => void;
}

interface ImportError {
    row: number;
    error: string;
}

export default function BulkImportModal({ eventId, onClose, onSuccess }: BulkImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<{
        success: boolean;
        created: number;
        errors?: ImportError[];
        message: string;
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const dropped = e.dataTransfer.files[0];
        if (dropped && /\.(xlsx|xls|csv)$/i.test(dropped.name)) {
            setFile(dropped);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('eventId', eventId);

            const res = await fetch('/api/attendees/bulk', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                setResult(data);
                if (data.success && (!data.errors || data.errors.length === 0)) {
                    setTimeout(() => {
                        onSuccess();
                        onClose();
                    }, 2000);
                } else {
                    onSuccess();
                }
            } else {
                setResult({
                    success: false,
                    created: 0,
                    message: data.error || 'Upload failed'
                });
            }
        } catch (err) {
            console.error('Upload error:', err);
            setResult({
                success: false,
                created: 0,
                message: 'Error uploading file'
            });
        } finally {
            setUploading(false);
        }
    };

    const downloadExcelTemplate = () => {
        const headers = ['Name', 'Email', 'Phone', 'Additional Name', 'Instagram', 'YouTube', 'Category', 'Guest Names', 'Meal Preference'];
        const sample1 = ['John Doe', 'john@example.com', '1234567890', 'Johnny', '@johndoe', 'JohnDoeChannel', '1m plus', 'Jane Doe, Bob Smith', 'veg'];
        const sample2 = ['Jane Smith', 'jane@example.com', '0987654321', '', '@janesmith', '', '500k to 1m', '', 'non-veg'];
        const sample3 = ['Alex Guest', '', '9876543210', '', '', '', 'Guest', '', 'veg'];

        const ws = XLSX.utils.aoa_to_sheet([headers, sample1, sample2, sample3]);

        // Set column widths
        ws['!cols'] = [
            { wch: 20 }, // Name
            { wch: 25 }, // Email
            { wch: 15 }, // Phone
            { wch: 18 }, // Additional Name
            { wch: 18 }, // Instagram
            { wch: 20 }, // YouTube
            { wch: 15 }, // Category
            { wch: 25 }, // Guest Names
            { wch: 16 }, // Meal Preference
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Attendees');
        XLSX.writeFile(wb, 'attendee_import_template.xlsx');
    };

    const categories = ['1m plus', '500k to 1m', '100k to 500k', '10k to 100k', '5k to 10k', 'Guest'];

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
                <div className="p-6 md:p-8">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-500/15 rounded-xl text-blue-400">
                                <FileSpreadsheet className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Bulk Import Attendees</h2>
                                <p className="text-sm text-muted-foreground">Upload Excel or CSV to add multiple attendees</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={uploading}
                            className="text-muted-foreground hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-50"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-5">
                        {/* Download Template */}
                        <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                            <div>
                                <p className="text-sm font-semibold text-blue-300">Download Template</p>
                                <p className="text-xs text-blue-400/70 mt-0.5">Pre-filled Excel file with sample data & all columns</p>
                            </div>
                            <button
                                onClick={downloadExcelTemplate}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                            >
                                <Download className="w-4 h-4" />
                                .xlsx Template
                            </button>
                        </div>

                        {/* Instructions */}
                        <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-yellow-400" />
                                Column Guide
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                                <div><span className="text-white font-medium">Name</span> — Required</div>
                                <div><span className="text-white font-medium">Email</span> — Optional</div>
                                <div><span className="text-white font-medium">Phone</span> — Optional, min 10 digits</div>
                                <div><span className="text-white font-medium">Additional Name</span> — Optional</div>
                                <div><span className="text-white font-medium">Instagram / YouTube</span> — Optional</div>
                                <div><span className="text-white font-medium">Guest Names</span> — Comma separated</div>
                                <div className="sm:col-span-2">
                                    <span className="text-white font-medium">Category</span> — {categories.map((c, i) => (
                                        <span key={c} className="text-blue-400">{c}{i < categories.length - 1 ? ', ' : ''}</span>
                                    ))}
                                </div>
                                <div className="sm:col-span-2">
                                    <span className="text-white font-medium">Meal Preference</span> — <span className="text-blue-400">veg</span> or <span className="text-blue-400">non-veg</span> (defaults to veg)
                                </div>
                            </div>
                        </div>

                        {/* Drop Zone */}
                        <div
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => !uploading && fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                                ${file
                                    ? 'border-green-500/50 bg-green-500/5'
                                    : 'border-border hover:border-blue-500/50 hover:bg-blue-500/5'
                                }
                                ${uploading ? 'pointer-events-none opacity-60' : ''}
                            `}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileChange}
                                className="hidden"
                                disabled={uploading}
                            />
                            {file ? (
                                <div className="space-y-2">
                                    <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" />
                                    <p className="text-white font-semibold">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {(file.size / 1024).toFixed(1)} KB · Click to change
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                                    <p className="text-white font-medium">Drop your file here or click to browse</p>
                                    <p className="text-xs text-muted-foreground">Supports .xlsx, .xls, .csv</p>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleUpload}
                                disabled={!file || uploading}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm transition-all
                                    ${!file || uploading
                                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg hover:shadow-blue-500/20'
                                    }`}
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        Import Attendees
                                    </>
                                )}
                            </button>
                            <button
                                onClick={onClose}
                                disabled={uploading}
                                className="px-6 py-3 border border-border rounded-xl font-semibold text-sm text-muted-foreground hover:text-white hover:bg-white/5 disabled:opacity-50 transition-all"
                            >
                                Cancel
                            </button>
                        </div>

                        {/* Results */}
                        {result && (
                            <div className={`border rounded-xl p-4 ${
                                result.success
                                    ? 'bg-green-500/10 border-green-500/30'
                                    : 'bg-red-500/10 border-red-500/30'
                            }`}>
                                <div className="flex items-start gap-3">
                                    {result.success
                                        ? <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                                        : <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                                    }
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-semibold text-sm ${result.success ? 'text-green-300' : 'text-red-300'}`}>
                                            {result.success ? 'Import Complete' : 'Import Failed'}
                                        </p>
                                        <p className={`text-sm mt-0.5 ${result.success ? 'text-green-400/80' : 'text-red-400/80'}`}>
                                            {result.message}
                                        </p>

                                        {result.errors && result.errors.length > 0 && (
                                            <div className="mt-3">
                                                <p className="text-xs font-semibold text-red-300 mb-1.5">
                                                    Row Errors ({result.errors.length}):
                                                </p>
                                                <div className="max-h-40 overflow-y-auto bg-black/20 rounded-lg p-2 space-y-1">
                                                    {result.errors.map((err, idx) => (
                                                        <p key={idx} className="text-xs text-red-400">
                                                            <span className="font-mono font-bold">Row {err.row}:</span> {err.error}
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

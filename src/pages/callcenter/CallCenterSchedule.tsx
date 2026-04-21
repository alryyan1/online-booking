import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { pdf } from "@react-pdf/renderer";
import { useAuth } from "../../contexts/AuthContext";
import {
  getSpecializations,
  getDoctorsBySpec,
  updateDoctorInSpec,
  type Specialization,
  type Doctor,
  type WorkingDay,
  type Shift,
} from "../../services/facilityService";
import { Search, X, Stethoscope, FileDown, User } from "lucide-react";
import Spinner from "../../components/common/Spinner";
import { cn } from "../../lib/utils";
import ZoomableAvatar from "../../components/common/ZoomableAvatar";

import { SchedulePDF } from "./components/SchedulePDF";
import { DayCell } from "./components/DayCell";
import { DAYS } from "./constants";

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CallCenterSchedule() {
  const { facilityId } = useAuth() as { facilityId: string };
  const [specs, setSpecs] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorsBySpec, setDoctorsBySpec] = useState<Record<string, Doctor[]>>(
    {},
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const loadData = async () => {
    if (!facilityId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const specData = (await getSpecializations(
        facilityId,
      )) as Specialization[];
      console.log("specData", specData);
      const sorted = specData
        .filter((s) => s.isActive !== false)
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      setSpecs(sorted);

      const results = await Promise.all(
        sorted.map(async (spec) => {
          try {
            return {
              specId: spec.id,
              docs: (await getDoctorsBySpec(facilityId, spec.id)) as Doctor[],
            };
          } catch {
            return { specId: spec.id, docs: [] };
          }
        }),
      );
      const map: Record<string, Doctor[]> = {};
      results.forEach(({ specId, docs }) => {
        map[specId] = docs;
      });
      setDoctorsBySpec(map);
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء تحميل البيانات");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [facilityId]);

  // Called by DayCell after a successful save — update local state without refetch
  const handleScheduleSaved = (
    docId: string,
    newSchedule: Record<string, WorkingDay | null>,
  ) => {
    console.log(newSchedule,'newshedule',docId,'docId')
    setDoctorsBySpec((prev) => {
      const next = { ...prev };
      for (const specId of Object.keys(next)) {
        next[specId] = next[specId].map((d) =>
          d.id === docId ? { ...d, workingSchedule: newSchedule } : d,
        );
      }
      return next;
    });
  };

  const rows = specs.flatMap((spec) => {
    const doctors = doctorsBySpec[spec.id] || [];
    const term = searchTerm.toLowerCase().trim();
    const filtered = term
      ? doctors.filter(
          (d) =>
            d.docName.toLowerCase().includes(term) ||
            spec.specName.toLowerCase().includes(term) ||
            d.phoneNumber?.includes(term),
        )
      : doctors;
    return filtered.map((doc) => ({ spec, doc }));
  });

  // @ts-ignore Using React PDF any types correctly
  const handleDownloadPDF = async () => {
    if (!specs.length) return;
    setIsExporting(true);
    const toastId = toast.loading("جاري إنشاء التقرير...");
    try {
      const blob = await pdf(
        <SchedulePDF specs={specs} doctorsBySpec={doctorsBySpec} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `جدول-الأطباء-${new Date().toLocaleDateString("ar-EG").replace(/\//g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("تم تحميل التقرير", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء التصدير", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) return <Spinner size="lg" />;

  return (
    <div className="mx-auto max-w-350 px-4 py-6 md:px-6">
      {/* ── Header ── */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900">
              جدول عمل الأطباء
            </h1>
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting || !specs.length}
              className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isExporting ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )}
              {isExporting ? "جاري التحضير..." : "تحميل PDF"}
            </button>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            انقر على أي خانة يوم لتعديل أوقات دوام الطبيب
          </p>
        </div>

        <div className="relative w-72">
          <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم الطبيب أو التخصص..."
            className="w-full rounded-md border border-gray-200 bg-white py-1.5 pr-8 pl-7 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Empty states ── */}
      {specs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-20 text-center shadow-sm">
          <Stethoscope className="mb-3 h-14 w-14 text-gray-200" />
          <p className="text-sm text-gray-400">لا توجد تخصصات مسجلة للمركز</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-20 text-center shadow-sm">
          <p className="text-sm text-gray-400">
            لا توجد نتائج تطابق "{searchTerm}"
          </p>
          <button
            onClick={() => setSearchTerm("")}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            عرض الكل
          </button>
        </div>
      ) : (
        /* ── Table ── */
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-225 text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500">
                  <th className="px-3 py-2.5 text-right whitespace-nowrap">
                    التخصص
                  </th>
                  <th className="px-3 py-2.5 text-right whitespace-nowrap">
                    الطبيب
                  </th>
                  {DAYS.map((day) => (
                    <th
                      key={day}
                      className="px-2 py-2.5 text-center whitespace-nowrap"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(({ spec, doc }) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-3 py-2 text-xs font-semibold text-gray-500 whitespace-nowrap align-middle">
                      {spec.specName}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 overflow-hidden">
                          {doc.photoUrl ? (
                            <ZoomableAvatar
                              src={doc.photoUrl}
                              alt={doc.docName}
                              size="xs"
                            />
                          ) : (
                            <User className="h-3.5 w-3.5 text-blue-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900 leading-tight whitespace-nowrap">
                            {doc.docName}
                          </p>
                          {doc.phoneNumber && (
                            <p className="text-[11px] text-gray-400" dir="ltr">
                              {doc.phoneNumber}
                            </p>
                          )}
                        </div>
                        {!doc.isActive && (
                          <span className="rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-500">
                            غير نشط
                          </span>
                        )}
                        
                      </div>
                    </td>
                    {DAYS.map((day) => (
                      <DayCell
                        key={day}
                        doc={doc}
                        specId={spec.id}
                        day={day}
                        facilityId={facilityId}
                        onSaved={handleScheduleSaved}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

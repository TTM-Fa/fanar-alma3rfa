import React from "react";

const TraceTable = ({ traceData, language }) => {
  const isArabic = language === "العربية";
  const direction = isArabic ? "rtl" : "ltr";

  if (
    !traceData ||
    !traceData.traceSteps ||
    traceData.traceSteps.length === 0
  ) {
    return (
      <div className="trace-table-container" dir={direction}>
        <div className="p-4 mb-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            {isArabic
              ? "لا يمكن تتبع تنفيذ الكود. يرجى التحقق من صحة الكود."
              : "Unable to trace code execution. Please check code syntax."}
          </p>
        </div>
      </div>
    );
  }

  const { headers, traceSteps } = traceData;

  return (
    <div className="trace-table-container" dir={direction}>
      <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-200">
        <table className="min-w-full bg-white">
          <thead className="bg-blue-600 text-white">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className={`px-4 py-3 text-${
                    isArabic ? "right" : "left"
                  } text-sm font-semibold`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {traceSteps.map((step, index) => (
              <tr
                key={index}
                className={`${
                  index % 2 === 0 ? "bg-gray-50" : "bg-white"
                } hover:bg-blue-50 transition-colors`}
              >
                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-center">
                  {step.step || ""}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 font-mono bg-gray-100">
                  {step.statement || ""}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                  {step.variables || ""}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 font-mono bg-green-50">
                  {step.output || ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TraceTable;

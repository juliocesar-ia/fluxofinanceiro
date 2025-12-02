export default function SummaryCard({ title, value }) {
  return (
    <div className="bg-[#15151b] p-5 rounded-2xl shadow-lg border border-[#222]">
      <p className="text-gray-400">{title}</p>
      <h2 className="text-2xl mt-2 font-bold">
        R$ {value.toFixed(2).replace(".", ",")}
      </h2>
    </div>
  );
}

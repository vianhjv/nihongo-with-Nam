import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BookOpen, FileJson, FileText, Eye, EyeOff } from "lucide-react";

type GlossItem = [string, string];

type SegmentJson = {
  id: number;
  title: string;
  pali: string;
  gloss: GlossItem[];
  structure: string;
};

type SuttaJson = {
  sutta: string;
  slug: string;
  language: string;
  display?: {
    showPaliByDefault?: boolean;
    showGlossByDefault?: boolean;
    showStructureByDefault?: boolean;
  };
  segments: SegmentJson[];
};

type SegmentText = {
  id: number;
  title: string;
  pali: string;
};

function parseSegmentText(input: string): SegmentText[] {
  const regex = /^\[SEGMENT\s+(\d+)\]\s*(.+)$/gm;
  const matches = [...input.matchAll(regex)];
  const segments: SegmentText[] = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const id = Number(match[1]);
    const title = match[2].trim();
    const start = (match.index ?? 0) + match[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index ?? input.length : input.length;
    const pali = input.slice(start, end).trim();
    segments.push({ id, title, pali });
  }

  return segments;
}

function safeJsonParse(text: string): SuttaJson | null {
  try {
    const parsed = JSON.parse(text);
    if (!parsed?.segments || !Array.isArray(parsed.segments)) return null;
    return parsed as SuttaJson;
  } catch {
    return null;
  }
}

const sampleSegmentText = `[SEGMENT 1] Mở đầu bối cảnh
Evaṁ me sutaṁ — ekaṁ samayaṁ bhagavā bārāṇasiyaṁ viharati isipatane migadāye. Tatra kho bhagavā pañcavaggiye bhikkhū āmantesi.

[SEGMENT 2] Hai cực đoan không nên theo
Dvem’me, bhikkhave, antā pabbajitena na sevitabbā.`;

const sampleJson: SuttaJson = {
  sutta: "Dhammacakkappavattana Sutta",
  slug: "dhammacakkappavattana",
  language: "pi",
  segments: [
    {
      id: 1,
      title: "Mở đầu bối cảnh",
      pali: "Evaṁ me sutaṁ — ekaṁ samayaṁ bhagavā bārāṇasiyaṁ viharati isipatane migadāye. Tatra kho bhagavā pañcavaggiye bhikkhū āmantesi.",
      gloss: [
        ["Evaṁ me sutaṁ", "như vậy, bởi tôi, đã được nghe = tôi nghe như vầy"],
        ["ekaṁ samayaṁ", "vào một thời"],
        ["bhagavā", "Thế Tôn"],
        ["bārāṇasiyaṁ", "tại Bārāṇasī"],
        ["viharati", "đang cư trú, đang ở"],
        ["isipatane migadāye", "ở Isipatana, vườn Nai"],
        ["Tatra kho bhagavā", "ở đó, thật vậy, Thế Tôn"],
        ["pañcavaggiye bhikkhū", "các tỳ-kheo nhóm năm vị"],
        ["āmantesi", "đã gọi, đã nói với"]
      ],
      structure: "[công thức mở đầu] + [thời gian] + [chủ thể] + [địa điểm] + [động từ] + [địa điểm cụ thể]; rồi [mở cảnh] + [chủ thể] + [đối tượng] + [động từ]"
    },
    {
      id: 2,
      title: "Hai cực đoan không nên theo",
      pali: "Dvem’me, bhikkhave, antā pabbajitena na sevitabbā.",
      gloss: [
        ["Dve ime, bhikkhave, antā", "này các Tỳ-kheo, hai cực đoan này"],
        ["pabbajitena", "bởi người xuất gia, đối với người xuất gia"],
        ["na sevitabbā", "không nên được theo, không nên thực hành"]
      ],
      structure: "[đối tượng được nêu] + [người liên hệ] + [điều không nên làm]"
    }
  ]
};

export default function DhammacakkappavattanaSegmentViewer() {
  const [segmentTextRaw, setSegmentTextRaw] = useState(sampleSegmentText);
  const [jsonRaw, setJsonRaw] = useState(JSON.stringify(sampleJson, null, 2));
  const [selectedId, setSelectedId] = useState<number>(1);
  const [showGloss, setShowGloss] = useState(true);
  const [showStructure, setShowStructure] = useState(true);

  const textSegments = useMemo(() => parseSegmentText(segmentTextRaw), [segmentTextRaw]);
  const jsonData = useMemo(() => safeJsonParse(jsonRaw), [jsonRaw]);

  const mergedSegments = useMemo(() => {
    const jsonMap = new Map<number, SegmentJson>();
    jsonData?.segments?.forEach((seg) => jsonMap.set(seg.id, seg));

    return textSegments.map((txt) => {
      const meta = jsonMap.get(txt.id);
      return {
        id: txt.id,
        title: txt.title,
        pali: txt.pali || meta?.pali || "",
        gloss: meta?.gloss || [],
        structure: meta?.structure || "",
        hasJson: !!meta,
      };
    });
  }, [jsonData, textSegments]);

  const selectedSegment = useMemo(
    () => mergedSegments.find((seg) => seg.id === selectedId) ?? mergedSegments[0],
    [mergedSegments, selectedId]
  );

  async function handleTextFileUpload(file: File | null) {
    if (!file) return;
    const text = await file.text();
    setSegmentTextRaw(text);
    const parsed = parseSegmentText(text);
    if (parsed.length > 0) setSelectedId(parsed[0].id);
  }

  async function handleJsonFileUpload(file: File | null) {
    if (!file) return;
    const text = await file.text();
    setJsonRaw(text);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Trình xem Kinh Chuyển Pháp Luân theo Segment
          </h1>
          <p className="text-sm md:text-base text-slate-600">
            Upload file <code>.txt</code> chia theo <code>[SEGMENT x]</code> và file <code>.json</code> giải thích.
            Bấm vào từng segment để hiện Pāli, dịch sát nghĩa theo cụm, và cấu trúc câu.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1 rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5" /> Dữ liệu đầu vào
              </CardTitle>
              <CardDescription>
                Con có thể upload file thật hoặc dán nội dung trực tiếp.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" /> File TXT segment
                </Label>
                <Input type="file" accept=".txt,text/plain" onChange={(e) => handleTextFileUpload(e.target.files?.[0] ?? null)} />
                <textarea
                  className="min-h-[180px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  value={segmentTextRaw}
                  onChange={(e) => setSegmentTextRaw(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <FileJson className="h-4 w-4" /> File JSON giải thích
                </Label>
                <Input type="file" accept=".json,application/json" onChange={(e) => handleJsonFileUpload(e.target.files?.[0] ?? null)} />
                <textarea
                  className="min-h-[180px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  value={jsonRaw}
                  onChange={(e) => setJsonRaw(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1 rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Danh sách segment</CardTitle>
              <CardDescription>
                {mergedSegments.length} segment từ TXT{jsonData ? " • JSON hợp lệ" : " • JSON chưa hợp lệ"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[560px] pr-3">
                <div className="space-y-2">
                  {mergedSegments.map((seg) => {
                    const active = seg.id === selectedId;
                    return (
                      <button
                        key={seg.id}
                        onClick={() => setSelectedId(seg.id)}
                        className={`w-full rounded-2xl border p-3 text-left transition ${
                          active
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold">Segment {seg.id}</div>
                            <div className={`mt-1 text-sm ${active ? "text-slate-200" : "text-slate-600"}`}>
                              {seg.title}
                            </div>
                          </div>
                          <Badge variant={seg.hasJson ? "default" : "secondary"}>
                            {seg.hasJson ? "Có JSON" : "Chưa ghép"}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1 rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Hiển thị</CardTitle>
              <CardDescription>
                Bật tắt phần nghĩa sát và cấu trúc câu.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Hiện nghĩa sát</Label>
                  <p className="text-xs text-slate-500">Hiện từng cụm Pāli → nghĩa sát</p>
                </div>
                <Switch checked={showGloss} onCheckedChange={setShowGloss} />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Hiện cấu trúc câu</Label>
                  <p className="text-xs text-slate-500">Hiện mẫu cấu trúc ngắn ở cuối đoạn</p>
                </div>
                <Switch checked={showStructure} onCheckedChange={setShowStructure} />
              </div>

              <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                Gợi ý: khi con dùng dữ liệu thật, chỉ cần thay file TXT segment và file JSON. Phần hiển thị sẽ tự ghép theo <code>id</code>.
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl">
                  Segment {selectedSegment?.id}: {selectedSegment?.title}
                </CardTitle>
                <CardDescription>
                  Pāli ở trên, nghĩa sát theo cụm ở dưới, và cấu trúc câu ở cuối.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{showGloss ? <Eye className="mr-1 h-3.5 w-3.5" /> : <EyeOff className="mr-1 h-3.5 w-3.5" />} Nghĩa sát</Badge>
                <Badge variant="outline">{showStructure ? <Eye className="mr-1 h-3.5 w-3.5" /> : <EyeOff className="mr-1 h-3.5 w-3.5" />} Cấu trúc</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {selectedSegment ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="mb-2 text-sm font-medium text-slate-500">Pāli</div>
                  <div className="text-lg leading-8 md:text-xl">{selectedSegment.pali}</div>
                </div>

                {showGloss && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-3 text-sm font-medium text-slate-500">Dịch sát nghĩa theo cụm</div>
                    <div className="space-y-3">
                      {selectedSegment.gloss.length > 0 ? (
                        selectedSegment.gloss.map(([paliChunk, meaning], idx) => (
                          <div key={idx} className="rounded-xl bg-white p-3 border border-slate-200">
                            <div className="font-medium text-slate-900">{paliChunk}</div>
                            <div className="mt-1 text-slate-600">→ {meaning}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-slate-500">Đoạn này chưa có gloss trong JSON.</div>
                      )}
                    </div>
                  </div>
                )}

                {showStructure && (
                  <div className="rounded-2xl border border-slate-200 bg-amber-50 p-5">
                    <div className="mb-2 text-sm font-medium text-amber-700">Cấu trúc câu</div>
                    <div className="text-slate-800">{selectedSegment.structure || "Đoạn này chưa có mô tả cấu trúc trong JSON."}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 p-6 text-slate-500">
                Chưa có segment nào. Con hãy upload file TXT chia theo [SEGMENT x].
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Cách ghép vào web của con</CardTitle>
            <CardDescription>
              Đây là hướng đơn giản nhất để con đưa thẳng lên mạng.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700 leading-7">
            <p>1. Con lưu file TXT segment và file JSON vào thư mục dữ liệu của web.</p>
            <p>2. Trang này sẽ đọc TXT, tách theo dòng <code>[SEGMENT x]</code>, rồi ghép với JSON theo <code>id</code>.</p>
            <p>3. Khi người dùng bấm vào một segment, trang hiện ra đúng phần Pāli, nghĩa sát, và cấu trúc câu của segment ấy.</p>
            <Separator />
            <p className="font-medium">Khi con dùng thật, hãy bỏ phần dữ liệu mẫu và thay bằng file thật của con.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

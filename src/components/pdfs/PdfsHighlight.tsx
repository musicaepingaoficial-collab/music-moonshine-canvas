import { Link } from "react-router-dom";
import { FileText, Sparkles, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePdfs } from "@/hooks/usePdfs";

export function PdfsHighlight() {
  const { data: pdfs } = usePdfs();
  const featured = pdfs?.slice(0, 6) ?? [];
  if (!featured.length) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">PDFs em destaque</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/pdfs">Ver todos <ChevronRight className="h-4 w-4 ml-1" /></Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {featured.map((p) => (
          <Link key={p.id} to="/pdfs" className="group">
            <Card className="overflow-hidden transition-transform group-hover:-translate-y-0.5">
              <div className="aspect-[3/4] bg-muted relative">
                {p.cover_url ? (
                  <img src={p.cover_url} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <FileText className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
                {p.access_type === "subscriber_bonus" ? (
                  <Badge className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0 bg-primary">
                    <Sparkles className="h-2.5 w-2.5 mr-0.5" />Bônus
                  </Badge>
                ) : (
                  <Badge className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0">
                    R$ {Number(p.price).toFixed(0)}
                  </Badge>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-medium line-clamp-2">{p.title}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

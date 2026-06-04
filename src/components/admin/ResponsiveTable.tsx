import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Helper components for Responsive Design
export const ResponsiveTable = ({ 
  headers, 
  children, 
  mobileCardMapper 
}: { 
  headers: string[], 
  children: React.ReactNode,
  mobileCardMapper: React.ReactNode
}) => (
  <>
    <div className="hidden md:block overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h, i) => <TableHead key={i}>{h}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
    <div className="md:hidden space-y-4">
      {mobileCardMapper}
    </div>
  </>
);

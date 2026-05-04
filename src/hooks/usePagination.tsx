import { useState, useMemo, createElement } from "react";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious, 
  PaginationEllipsis 
} from "@/components/ui/pagination";

export const usePagination = <T>(items: T[] = [], itemsPerPage: number = 24) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }, [items, currentPage, itemsPerPage]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const PaginationComponent = () => {
    if (totalPages <= 1) return null;

    const items = [];

    // Previous button
    items.push(
      createElement(PaginationItem, { key: "prev" },
        createElement(PaginationPrevious, {
          onClick: () => goToPage(currentPage - 1),
          className: currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
        })
      )
    );

    // Page numbers
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      if (
        pageNumber === 1 ||
        pageNumber === totalPages ||
        (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
      ) {
        items.push(
          createElement(PaginationItem, { key: pageNumber },
            createElement(PaginationLink, {
              isActive: pageNumber === currentPage,
              onClick: () => goToPage(pageNumber),
              className: "cursor-pointer"
            }, pageNumber)
          )
        );
      } else if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
        items.push(createElement(PaginationItem, { key: `ellipsis-${pageNumber}` }, 
          createElement(PaginationEllipsis)
        ));
      }
    }

    // Next button
    items.push(
      createElement(PaginationItem, { key: "next" },
        createElement(PaginationNext, {
          onClick: () => goToPage(currentPage + 1),
          className: currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
        })
      )
    );

    return createElement(Pagination, { className: "mt-8" },
      createElement(PaginationContent, null, items)
    );
  };

  return { paginatedItems, PaginationComponent, currentPage, totalPages };
};

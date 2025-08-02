import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import NotFound from "@/pages/not-found";
import BookGenerator from "@/pages/book-generator";
import BooksPage from "@/pages/books";
import ContentReview from "@/pages/ContentReview";
import BookReview from "@/pages/book-review";
import BookRewrite from "@/pages/book-rewrite";

function Router() {
  return (
    <Switch>
      <Route path="/" component={BookGenerator} />
      <Route path="/books" component={BooksPage} />
      <Route path="/content-review" component={ContentReview} />
      <Route path="/review" component={BookReview} />
      <Route path="/rewrite" component={BookRewrite} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="bookgen-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

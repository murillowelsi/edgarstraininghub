import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface BlogCardProps {
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  image?: string;
}

const BlogCard = ({ title, excerpt, category, readTime, image }: BlogCardProps) => {
  const { t } = useLanguage();

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      {image && (
        <div className="overflow-hidden">
          <img 
            src={image} 
            alt={title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="font-semibold">
            {category}
          </Badge>
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <Clock className="w-4 h-4" />
            <span>{readTime}</span>
          </div>
        </div>
        <CardTitle className="text-xl group-hover:text-primary transition-colors">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-4 line-clamp-3">
          {excerpt}
        </CardDescription>
        <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          {t.blog.readMore}
        </Button>
      </CardContent>
    </Card>
  );
};

export default BlogCard;
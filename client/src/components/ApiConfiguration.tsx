import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function ApiConfiguration() {
  const [showGithubKey, setShowGithubKey] = useState(false);
  const [showDeepseekKey, setShowDeepseekKey] = useState(false);

  const { data: keyStatus } = useQuery({
    queryKey: ['/api/validate-keys'],
    refetchInterval: 30000, // Check every 30 seconds
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">API Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              GitHub API Key
            </Label>
            <div className="relative">
              <Input
                type={showGithubKey ? "text" : "password"}
                className="pr-10"
                placeholder="Enter GitHub API key"
                value="ghp_****************************"
                readOnly
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute inset-y-0 right-0 px-3 flex items-center"
                onClick={() => setShowGithubKey(!showGithubKey)}
              >
                {showGithubKey ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
            <div className="mt-1">
              {keyStatus?.github ? (
                <span className="text-xs text-green-600">✓ Connected</span>
              ) : (
                <span className="text-xs text-red-600">✗ Not configured</span>
              )}
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              DeepSeek API Key
            </Label>
            <div className="relative">
              <Input
                type={showDeepseekKey ? "text" : "password"}
                className="pr-10"
                placeholder="Enter DeepSeek API key"
                value="ds_****************************"
                readOnly
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute inset-y-0 right-0 px-3 flex items-center"
                onClick={() => setShowDeepseekKey(!showDeepseekKey)}
              >
                {showDeepseekKey ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
            <div className="mt-1">
              {keyStatus?.deepseek ? (
                <span className="text-xs text-green-600">✓ Connected</span>
              ) : (
                <span className="text-xs text-red-600">✗ Not configured</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

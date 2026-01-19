import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AEROSPACE_DEFENSE_NAICS } from "@/data/naicsCodes";
import { cn } from "@/lib/utils";

interface NAICSSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  testId?: string;
}

export function NAICSSelector({ value, onChange, testId }: NAICSSelectorProps) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState("");

  // Parse multiple comma-separated values
  const selectedCodes = value
    ? value.split(",").map((v) => v.trim()).filter(Boolean)
    : [];

  const handleSelect = (code: string, description: string) => {
    const fullValue = `${code} - ${description}`;
    const newCodes = [...selectedCodes, fullValue];
    onChange(newCodes.join(", "));
    setOpen(false);
  };

  const handleRemove = (index: number) => {
    const newCodes = selectedCodes.filter((_, i) => i !== index);
    onChange(newCodes.join(", "));
  };

  const handleCustomAdd = () => {
    if (customValue.trim()) {
      const newCodes = [...selectedCodes, customValue.trim()];
      onChange(newCodes.join(", "));
      setCustomValue("");
      setCustomMode(false);
      setOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
              data-testid={testId}
            >
              {selectedCodes.length === 0
                ? "Select NAICS code(s)..."
                : `${selectedCodes.length} code${selectedCodes.length > 1 ? "s" : ""} selected`}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[600px] p-0" align="start">
            {!customMode ? (
              <Command>
                <CommandInput placeholder="Search NAICS codes..." />
                <CommandList>
                  <CommandEmpty>
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground mb-2">No NAICS code found.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCustomMode(true)}
                        data-testid="button-custom-naics"
                      >
                        Enter custom code
                      </Button>
                    </div>
                  </CommandEmpty>
                  {AEROSPACE_DEFENSE_NAICS.map((category) => (
                    <CommandGroup key={category.category} heading={category.category}>
                      {category.codes.map((naicsCode) => {
                        const fullValue = `${naicsCode.code} - ${naicsCode.description}`;
                        const isSelected = selectedCodes.some((selected) =>
                          selected.startsWith(naicsCode.code)
                        );
                        return (
                          <CommandItem
                            key={naicsCode.code}
                            value={`${naicsCode.code} ${naicsCode.description}`}
                            onSelect={() => handleSelect(naicsCode.code, naicsCode.description)}
                            disabled={isSelected}
                            data-testid={`naics-item-${naicsCode.code}`}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                isSelected ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="font-mono text-xs">{naicsCode.code}</span>
                              <span className="ml-2 text-sm truncate">{naicsCode.description}</span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  ))}
                </CommandList>
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setCustomMode(true)}
                    data-testid="button-toggle-custom"
                  >
                    Enter custom NAICS code
                  </Button>
                </div>
              </Command>
            ) : (
              <div className="p-4 space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Enter Custom NAICS Code</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Format: "CODE - Description" (e.g., "541330 - Engineering Services")
                  </p>
                  <Input
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    placeholder="Enter NAICS code..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCustomAdd();
                      }
                    }}
                    data-testid="input-custom-naics"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleCustomAdd}
                    disabled={!customValue.trim()}
                    data-testid="button-add-custom"
                  >
                    Add Code
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCustomMode(false);
                      setCustomValue("");
                    }}
                    data-testid="button-back-search"
                  >
                    Back to Search
                  </Button>
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Selected codes display */}
      {selectedCodes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCodes.map((code, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="px-2 py-1 text-xs"
              data-testid={`badge-naics-${index}`}
            >
              <span className="max-w-[300px] truncate">{code}</span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="ml-2 hover:text-destructive"
                data-testid={`button-remove-naics-${index}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

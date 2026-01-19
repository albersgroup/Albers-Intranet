import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SolicitationInfoFormProps {
  onFormDataChange?: (data: Record<string, any>) => void;
}

export default function SolicitationInfoForm({ onFormDataChange }: SolicitationInfoFormProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    solicitationName: "",
    solicitationNumber: "",
    solicitationType: "",
    customer: "",
    publicationDate: "",
    dueDate: "",
    periodOfPerformance: "",
    budget: "",
    captureManager: "",
    customerContact: "",
    opportunityLink: "",
    notes: ""
  });

  // Notify parent component when form data changes
  useEffect(() => {
    if (onFormDataChange) {
      onFormDataChange(formData);
    }
  }, [formData, onFormDataChange]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 20) {
      alert("Maximum 20 files allowed");
      return;
    }
    setFiles([...files, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Upload files to object storage first
      const uploadedFilePaths: string[] = [];
      for (const file of files) {
        // Get upload URL from backend
        const uploadResponse = await fetch('/api/objects/upload', {
          method: 'POST',
        });
        const { uploadURL } = await uploadResponse.json();
        
        // Upload file to object storage
        await fetch(uploadURL, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });
        
        // Extract object path from upload URL
        const url = new URL(uploadURL);
        const objectPath = url.pathname;
        uploadedFilePaths.push(objectPath);
      }

      // Submit form data with file paths
      const response = await fetch('/api/solicitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          filePaths: uploadedFilePaths
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit solicitation info');
      }

      toast({
        title: "Success",
        description: "Solicitation information saved successfully",
      });

      // Don't reset form - keep data for completion tracking and email submission
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: "Failed to save solicitation information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
      <div className="bg-card border border-card-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Solicitation Information</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="solicitation-name">Solicitation Name</Label>
            <Input
              id="solicitation-name"
              placeholder="Enter solicitation name"
              data-testid="input-solicitation-name"
              value={formData.solicitationName}
              onChange={(e) => setFormData({ ...formData, solicitationName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="solicitation-number">Solicitation Number</Label>
            <Input
              id="solicitation-number"
              placeholder="Enter solicitation number"
              data-testid="input-solicitation-number"
              value={formData.solicitationNumber}
              onChange={(e) => setFormData({ ...formData, solicitationNumber: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="solicitation-type">Solicitation Type</Label>
            <Select value={formData.solicitationType} onValueChange={(value) => setFormData({ ...formData, solicitationType: value })}>
              <SelectTrigger id="solicitation-type" data-testid="select-solicitation-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rfp">RFP (Request for Proposal)</SelectItem>
                <SelectItem value="rfq">RFQ (Request for Quote)</SelectItem>
                <SelectItem value="rfi">RFI (Request for Information)</SelectItem>
                <SelectItem value="idiq">IDIQ (Indefinite Delivery/Indefinite Quantity)</SelectItem>
                <SelectItem value="bpa">BPA (Blanket Purchase Agreement)</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer">Customer</Label>
            <Input
              id="customer"
              placeholder="Enter customer name"
              data-testid="input-customer"
              value={formData.customer}
              onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="publication-date">Solicitation Publication Date</Label>
            <Input
              id="publication-date"
              type="date"
              data-testid="input-publication-date"
              value={formData.publicationDate}
              onChange={(e) => setFormData({ ...formData, publicationDate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due-date">Solicitation Due Date</Label>
            <Input
              id="due-date"
              type="date"
              data-testid="input-due-date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="period-performance">Period of Performance</Label>
            <Input
              id="period-performance"
              placeholder="e.g., 12 months, 3 years"
              data-testid="input-period-performance"
              value={formData.periodOfPerformance}
              onChange={(e) => setFormData({ ...formData, periodOfPerformance: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Budget</Label>
            <Input
              id="budget"
              placeholder="e.g., $500,000"
              data-testid="input-budget"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="capture-manager">Capture Manager Name</Label>
            <Input
              id="capture-manager"
              placeholder="Enter capture manager name"
              data-testid="input-capture-manager"
              value={formData.captureManager}
              onChange={(e) => setFormData({ ...formData, captureManager: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-contact">Have you met with or connected with the Customer?</Label>
            <Select value={formData.customerContact} onValueChange={(value) => setFormData({ ...formData, customerContact: value })}>
              <SelectTrigger id="customer-contact" data-testid="select-customer-contact">
                <SelectValue placeholder="Select response" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="opportunity-link">Link to Opportunity</Label>
            <Input
              id="opportunity-link"
              type="url"
              placeholder="https://sam.gov/..."
              data-testid="input-opportunity-link"
              value={formData.opportunityLink}
              onChange={(e) => setFormData({ ...formData, opportunityLink: e.target.value })}
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes or context..."
              rows={4}
              data-testid="textarea-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Supporting Documents</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Upload solicitation documents, requirements, or other supporting files (max 20 files)
        </p>

        <Alert className="mb-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" data-testid="alert-cui-warning">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          <AlertDescription className="text-xs text-red-900 dark:text-red-300">
            Do not upload any documents containing CUI material.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <input
              type="file"
              id="file-upload"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              data-testid="input-file-upload"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('file-upload')?.click()}
              className="w-full"
              data-testid="button-upload-files"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Files ({files.length}/20)
            </Button>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Uploaded Files</Label>
              <div className="border border-border rounded-md divide-y divide-border">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                      className="flex-shrink-0"
                      data-testid={`button-remove-file-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button 
          type="submit" 
          className="bg-primary hover:bg-primary/90" 
          data-testid="button-save-solicitation"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save Solicitation Info"}
        </Button>
      </div>
    </form>
  );
}

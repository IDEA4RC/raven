export enum PermitStatus {
    PENDING = 0,
    INICIATED = 1,
    SUBMITTED = 2,
    REJECTED = 3,
    GRANTED = 4,
    EXPIRED = 5
}

export const CenterSarcoma = [
  "INT",
  "VGR",
  "MSCI",
  "CLB",
  "MUH",
  "MMCI",
  "OUS",
  "IIS-FJD"
] as const;

export const CenterHNC = [
  "INT",
  "FPNS",
  "APHP",
  "UKE",
  "MMCI",
  "OUS",
  "IIS-FJD"
] as const;

export enum CancerType {
    SARCOMA = "Sarc.",
    HNC = "H&N"
}


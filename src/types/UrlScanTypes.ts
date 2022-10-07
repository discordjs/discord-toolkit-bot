export type ScanData = {
	api: string;
	result: string;
	uuid: string;
};

export type UrlScanResultPageData = {
	asn: string;
	asnname: string;
	country: string;
	domain: string;
	ip: string;
	server: string;
};

export type UrlScanResultTask = {
	reportURL: string;
	screenshotURL: string;
	url: string;
	uuid: string;
};

export type UrlScanResultVerdicts = {
	overall: {
		malicious: boolean;
		score: number;
	};
};

export type UrlScanResult = {
	page: UrlScanResultPageData;
	result: string;
	task: UrlScanResultTask;
	uuid: string;
	verdicts: UrlScanResultVerdicts;
};

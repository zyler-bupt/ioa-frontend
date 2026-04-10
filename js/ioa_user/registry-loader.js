/**
 * registry-loader.js
 * Load and normalize registry agents from /data/registry.
 */

(function () {
  const REGISTRY_BASE = "data/registry";
  const CATEGORY_FILE = "categories.json";
  const AGENT_FILES = [
    "audio_agents.json",
    "audit_agents.json",
    "execution_agents.json",
    "fusion_agents.json",
    "keyframe_agents.json",
    "map_agents.json",
    "meteorology_agents.json",
    "planning_agents.json",
    "report_agents.json",
    "scheduling_agents.json",
    "video_agents.json",
  ];

  const CLOUD_CLUSTER_NODE_ID = "cloud-cluster-01";
  const EDGE_NODE_IDS = ["edge-bj-01", "edge-bj-02", "edge-sh-01", "edge-gz-01"];

  const CATEGORY_TO_DNS = {
    video_understanding_agent: "perception",
    image_understanding_agent: "perception",
    audio_understanding_agent: "perception",
    multimodal_fusion_agent: "perception",
    knowledge_retrieval_agent: "service",
    geo_spatial_agent: "perception",
    risk_assessment_agent: "planning",
    anomaly_detection_agent: "perception",
    workflow_planning_agent: "planning",
    resource_scheduling_agent: "planning",
    tool_execution_agent: "execution",
    report_generation_agent: "service",
    alert_notification_agent: "execution",
    compliance_audit_agent: "service",
  };

  let loadPromise = null;

  function toStableId(rawName) {
    return `registry-${String(rawName || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")}`;
  }

  function hashToIndex(text, modulo) {
    const s = String(text || "");
    let hash = 0;
    for (let i = 0; i < s.length; i += 1) {
      hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
    }
    return modulo > 0 ? hash % modulo : 0;
  }

  function mapDeploymentToLayer(deployment) {
    const v = String(deployment || "").toLowerCase();
    if (v === "cloud") return "cloud";
    return "edge";
  }

  function mapDeploymentToNodeId(deployment, rawName) {
    const layer = mapDeploymentToLayer(deployment);
    if (layer === "cloud") return CLOUD_CLUSTER_NODE_ID;
    const index = hashToIndex(rawName, EDGE_NODE_IDS.length);
    return EDGE_NODE_IDS[index];
  }

  function toArray(value) {
    return Array.isArray(value) ? value.filter(Boolean) : [];
  }

  function safeFetchJson(path) {
    return fetch(path).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load ${path} (${response.status})`);
      }
      return response.json();
    });
  }

  function normalizeAgent(rawAgent, categoryById, seenIds) {
    const rawName = String(rawAgent?.name || "").trim();
    if (!rawName) return null;

    const deployment = String(rawAgent?.deployment || "edge").toLowerCase();
    const layer = mapDeploymentToLayer(deployment);
    const nodeId = mapDeploymentToNodeId(deployment, rawName);

    const registryCategory = String(rawAgent?.category || "").trim();
    const categoryMeta = categoryById.get(registryCategory) || null;
    const dnsCategory = CATEGORY_TO_DNS[registryCategory] || "service";

    const displayTitle = String(rawAgent?.display_name || "").trim();
    const description =
      String(rawAgent?.description || categoryMeta?.description || "").trim();
    const tools = toArray(rawAgent?.tools_involved);
    const capabilities = tools.length
      ? tools
      : toArray(rawAgent?.capability_type ? [rawAgent.capability_type] : []);

    let id = toStableId(rawName);
    if (!id || id === "registry-") id = `registry-${seenIds.size + 1}`;
    if (seenIds.has(id)) {
      let suffix = 2;
      while (seenIds.has(`${id}-${suffix}`)) suffix += 1;
      id = `${id}-${suffix}`;
    }
    seenIds.add(id);

    const resource = String(rawAgent?.resource || "").trim();
    const profile = String(rawAgent?.profile || "").trim();
    const suffix = [deployment, resource, profile].filter(Boolean).join(" / ");
    const summary = suffix
      ? `${categoryMeta?.display_name || registryCategory || "Agent"} · ${suffix}`
      : categoryMeta?.display_name || registryCategory || "Agent";

    return {
      id,
      name: rawName,
      displayName: rawName,
      displayTitle,
      dnsName: rawName,
      rawName,
      type: "agent",
      layer,
      node_id: nodeId,
      nodeId,
      nodeLabel: nodeId,
      status: "active",
      category: dnsCategory,
      registryCategory,
      deployment,
      description,
      summary,
      capabilities,
      tools: capabilities,
      agentType: rawAgent?.agent_type || "",
      executor: rawAgent?.executor || "",
      resource,
      profile,
      createdAt: 0,
      isRegistrySource: true,
    };
  }

  async function loadRegistryAgents(options = {}) {
    const force = options && options.force === true;
    if (loadPromise && !force) return loadPromise;

    loadPromise = (async () => {
      window.registryLoadError = "";
      try {
        const [categories, ...agentGroups] = await Promise.all([
          safeFetchJson(`${REGISTRY_BASE}/${CATEGORY_FILE}`),
          ...AGENT_FILES.map((file) => safeFetchJson(`${REGISTRY_BASE}/${file}`)),
        ]);

        const categoryById = new Map();
        toArray(categories).forEach((item) => {
          const key = String(item?.category || "").trim();
          if (!key) return;
          categoryById.set(key, item);
        });

        const seenIds = new Set();
        const normalized = [];
        agentGroups.forEach((group) => {
          toArray(group).forEach((rawAgent) => {
            const item = normalizeAgent(rawAgent, categoryById, seenIds);
            if (item) normalized.push(item);
          });
        });

        normalized.sort((a, b) => {
          const aKey = `${a.rawName}|${a.deployment}|${a.resource}|${a.profile}`.toLowerCase();
          const bKey = `${b.rawName}|${b.deployment}|${b.resource}|${b.profile}`.toLowerCase();
          return aKey.localeCompare(bKey);
        });

        window.registryAgents = normalized;
        return normalized;
      } catch (error) {
        const message =
          error && error.message
            ? error.message
            : "Failed to load registry files.";
        window.registryAgents = [];
        window.registryLoadError = message;
        console.error("[registry-loader]", message);
        return [];
      }
    })();

    return loadPromise;
  }

  window.registryAgents = window.registryAgents || [];
  window.registryLoadError = window.registryLoadError || "";
  window.loadRegistryAgents = loadRegistryAgents;
})();
